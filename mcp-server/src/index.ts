#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { startRelay } from './relay';
import { getPowerAutomateToolDefs, handlePowerAutomateTool } from './tools/power-automate';
import { getSharePointToolDefs, handleSharePointTool } from './tools/sharepoint';
import { getIntuneToolDefs, handleIntuneTool } from './tools/intune';
import { getFormsToolDefs, handleFormsTool } from './tools/forms';
import { getGraphToolDefs, handleGraphTool } from './tools/graph';
import { getStatusToolDefs, handleStatusTool } from './tools/status';
import { getWorkspaceToolDefs, handleWorkspaceTool } from './tools/workspace';

const server = new Server(
  { name: 'm365-workbench', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Aggregate all tool definitions
function getAllToolDefs() {
  return [
    ...getPowerAutomateToolDefs(),
    ...getSharePointToolDefs(),
    ...getIntuneToolDefs(),
    ...getFormsToolDefs(),
    ...getGraphToolDefs(),
    ...getStatusToolDefs(),
    ...getWorkspaceToolDefs(),
  ];
}

// Handler registry - maps tool name prefixes to handlers
const handlers: Array<{ prefix: string; handler: (name: string, args: any) => Promise<any> }> = [
  { prefix: 'pa_', handler: handlePowerAutomateTool },
  { prefix: 'sp_', handler: handleSharePointTool },
  { prefix: 'intune_', handler: handleIntuneTool },
  { prefix: 'forms_', handler: handleFormsTool },
  { prefix: 'graph_', handler: handleGraphTool },
  { prefix: 'get_auth_', handler: handleStatusTool },
  { prefix: 'ws_', handler: handleWorkspaceTool },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: getAllToolDefs(),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  for (const { prefix, handler } of handlers) {
    if (name.startsWith(prefix)) {
      return handler(name, args || {});
    }
  }

  return {
    content: [{ type: 'text' as const, text: `Unknown tool: ${name}` }],
    isError: true,
  };
});

// Start relay to receive credentials from extension
startRelay();

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('M365 Workbench MCP server running on stdio');
}

main().catch(console.error);
