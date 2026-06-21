import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBrowserTools } from './browser.tool.js';
import { registerStorageTools } from './storage.tool.js';

export async function startMCPServer() {
  const server = new McpServer(
    { name: 'coffecat-runtime', version: '0.2.0' },
    {
      capabilities: { tools: {} },
      instructions: 'coffecat Runtime MCP Server — 提供浏览器自动化和存储能力。',
    }
  );

  registerBrowserTools(server);
  registerStorageTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[coffecat] MCP Server 已启动 (stdio)');
}

// 直接运行时启动
if (process.argv[1]?.includes('server.')) {
  startMCPServer().catch((err) => {
    console.error('[coffecat] MCP Server 启动失败:', err);
    process.exit(1);
  });
}
