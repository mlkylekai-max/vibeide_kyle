import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { publishRuntimeEvent } from '../eventbus/index.js';
import { completeRuntimeTask, createRuntimeTask, failRuntimeTask, startRuntimeTask } from '../task/index.js';

type RegisterTool = McpServer['registerTool'];

export function instrumentMcpToolEvents(server: McpServer): void {
  const originalRegisterTool = server.registerTool.bind(server) as RegisterTool;
  server.registerTool = ((name: string, config: unknown, callback: unknown) => {
    if (typeof callback !== 'function') {
      return originalRegisterTool(name as never, config as never, callback as never);
    }

    const wrapped = async (args: unknown, extra: unknown) => {
      const task = createRuntimeTask({
        source: 'mcp',
        kind: 'mcp.tool',
        toolName: name,
      });
      const startedTask = startRuntimeTask(task);
      publishRuntimeEvent({
        source: 'mcp',
        kind: 'tool.started',
        taskId: task.taskId,
        toolName: name,
        payload: { args: sanitizeToolArgs(args) },
      });
      try {
        const result = await callback(args, extra);
        completeRuntimeTask(startedTask, 0);
        publishRuntimeEvent({
          source: 'mcp',
          kind: 'tool.completed',
          taskId: task.taskId,
          toolName: name,
          payload: { exitCode: 0, ok: true },
        });
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failRuntimeTask(startedTask, message);
        publishRuntimeEvent({
          source: 'mcp',
          kind: 'tool.failed',
          taskId: task.taskId,
          toolName: name,
          message,
          payload: { exitCode: 1, ok: false },
        });
        throw error;
      }
    };

    return originalRegisterTool(name as never, config as never, wrapped as never);
  }) as RegisterTool;
}

function sanitizeToolArgs(args: unknown): unknown {
  if (!args || typeof args !== 'object') return args;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (/key|token|password|secret/i.test(key)) {
      copy[key] = '[redacted]';
    } else {
      copy[key] = value;
    }
  }
  return copy;
}
