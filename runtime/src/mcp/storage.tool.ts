import * as z from 'zod/v4';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { saveWorkspace, readWorkspace, listWorkspaces } from '../storage.js';

export function registerStorageTools(server: McpServer) {

  server.registerTool('storage.save', {
    description: '保存采集结果到 workspace',
    inputSchema: {
      workspace: z.string().describe('workspace 名称'),
      data: z.string().describe('要保存的 JSON 数据'),
    },
  }, async ({ workspace, data }) => {
    const parsed = JSON.parse(data);
    await saveWorkspace(workspace, parsed as Record<string, unknown>);
    return { content: [{ type: 'text', text: `已保存到 workspace: ${workspace}` }] };
  });

  server.registerTool('storage.read', {
    description: '读取已保存的 workspace 数据',
    inputSchema: {
      workspace: z.string().describe('workspace 名称'),
    },
  }, async ({ workspace }) => {
    const data = await readWorkspace(workspace);
    if (!data) return { content: [{ type: 'text', text: `workspace "${workspace}" 不存在或为空` }] };
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  });

  server.registerTool('storage.list', {
    description: '列出所有 workspace',
  }, async () => {
    const list = await listWorkspaces();
    return { content: [{ type: 'text', text: list.length ? list.join('\n') : '(空)' }] };
  });
}
