import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCredentialsFromRelay } from '../auth-store';
import { GraphClient } from '../clients/GraphClient';

const RELAY_URL = process.env.PA_RELAY_URL || 'http://127.0.0.1:8321';

async function getClient(): Promise<GraphClient> {
  // Try graph-specific credentials first, fall back to power-automate
  let creds = await fetchCredentialsFromRelay(RELAY_URL, 'graph');
  if (!creds) {
    creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
  }
  if (!creds) {
    throw new Error(
      'No Graph API credentials available. Make sure the relay is running and the extension has forwarded auth tokens.'
    );
  }
  return new GraphClient(creds);
}

export function registerGraphTools(server: McpServer): void {
  // graph__query - Generic Graph API query
  server.tool(
    'graph__query',
    'Execute a query against the Microsoft Graph API',
    {
      endpoint: z
        .string()
        .describe('The Graph API endpoint path (e.g. /me, /users, /sites)'),
      method: z
        .string()
        .optional()
        .describe('HTTP method (default GET)'),
      body: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Request body for POST/PATCH/PUT requests'),
    },
    async ({ endpoint, method, body }) => {
      try {
        const client = await getClient();
        const result = await client.query(endpoint, method || 'GET', body);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Graph API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // graph__get_me - Get current user profile
  server.tool(
    'graph__get_me',
    'Get the current user\'s profile from Graph API',
    {},
    async () => {
      try {
        const client = await getClient();
        const result = await client.query('/me');
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Graph API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // graph__list_sites - List SharePoint sites
  server.tool(
    'graph__list_sites',
    'List SharePoint sites accessible to the current user',
    {
      search: z
        .string()
        .optional()
        .describe('Optional search query to filter sites'),
    },
    async ({ search }) => {
      try {
        const client = await getClient();
        const endpoint = search
          ? `/sites?$search=${encodeURIComponent(search)}`
          : '/sites';
        const result = await client.query(endpoint);
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(result, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Graph API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
