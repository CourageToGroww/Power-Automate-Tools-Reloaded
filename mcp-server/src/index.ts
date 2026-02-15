import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerTools } from './mcp-tools';
import { registerGraphTools } from './tools/graph';
import { registerSharePointTools } from './tools/sharepoint';
import { registerIntuneTools } from './tools/intune';
import { registerFormsTools } from './tools/forms';
import { registerToolboxTools } from './tools/toolbox';

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'm365-workbench',
    version: '2.0.0',
  });

  // Register Power Automate tools (prefixed pa__)
  registerTools(server);

  // Register Graph API tools (prefixed graph__)
  registerGraphTools(server);

  // Register SharePoint tools (prefixed sp__)
  registerSharePointTools(server);

  // Register Intune tools (prefixed intune__)
  registerIntuneTools(server);

  // Register Forms tools (prefixed forms__)
  registerFormsTools(server);

  // Register Toolbox tools (prefixed toolbox__)
  registerToolboxTools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server failed to start:', err);
  process.exit(1);
});
