import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './mcp-tools';

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'm365-workbench',
    version: '2.0.0',
  });

  // Register Power Automate tools (prefixed pa__)
  registerTools(server);

  // Future: register tools from other service modules here
  // registerGraphTools(server);
  // registerSharePointTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
