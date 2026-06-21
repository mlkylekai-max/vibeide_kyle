export interface ParsedChunk {
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'system' | 'error' | 'init';
  content: string;
  toolName?: string;
  mcpServers?: Array<{ name: string; status: string }>;
}

export class ChatBuffer {
  private buffer = '';

  feed(chunk: string): ParsedChunk[] {
    this.buffer += chunk;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    const results: ParsedChunk[] = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parsed = this.parseLine(trimmed);
      if (parsed) results.push(parsed);
    }
    return results;
  }

  flush(): ParsedChunk[] {
    if (!this.buffer.trim()) return [];
    const result: ParsedChunk = { type: 'text', content: this.buffer.trim() };
    this.buffer = '';
    return [result];
  }

  private parseLine(line: string): ParsedChunk | null {
    try {
      const msg = JSON.parse(line);

      if (msg.type === 'assistant' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'text' && block.text) {
            return { type: 'text', content: block.text };
          }
          if (block.type === 'tool_use') {
            return {
              type: 'tool_call',
              content: `调用工具: ${block.name}`,
              toolName: block.name,
            };
          }
          if (block.type === 'thinking' && block.thinking) {
            return { type: 'thinking', content: block.thinking };
          }
        }
      }

      if (msg.type === 'user' && msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'tool_result') {
            const preview =
              typeof block.content === 'string'
                ? block.content.slice(0, 200)
                : JSON.stringify(block.content).slice(0, 200);
            return { type: 'tool_result', content: preview };
          }
        }
      }

      if (msg.type === 'system') {
        if (msg.subtype === 'init') {
          return {
            type: 'init',
            content: JSON.stringify(msg),
            mcpServers: Array.isArray(msg.mcp_servers) ? msg.mcp_servers : [],
          };
        }
        if (msg.subtype === 'thinking_tokens') {
          return null;
        }
        const text = typeof msg.message === 'string' ? msg.message : JSON.stringify(msg);
        return { type: 'system', content: text };
      }

      if (msg.type === 'result') {
        if (msg.is_error) {
          return {
            type: 'error',
            content: msg.result || `任务失败${msg.api_error_status ? ` (status: ${msg.api_error_status})` : ''}`,
          };
        }
        return { type: 'system', content: `完成: ${msg.subtype || msg.result || ''}` };
      }

      return null;
    } catch {
      return null;
    }
  }
}
