import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCredentialsFromRelay } from '../auth-store';
import { SharePointClient } from '../clients/SharePointClient';

const RELAY_URL = process.env.PA_RELAY_URL || 'http://127.0.0.1:8321';

async function getClient(): Promise<SharePointClient> {
  let creds = await fetchCredentialsFromRelay(RELAY_URL, 'sharepoint');
  if (!creds) {
    creds = await fetchCredentialsFromRelay(RELAY_URL, 'graph');
  }
  if (!creds) {
    throw new Error(
      'No SharePoint credentials available. Make sure the relay is running and the extension has forwarded auth tokens.'
    );
  }
  return new SharePointClient(creds);
}

export function registerSharePointTools(server: McpServer): void {
  server.tool(
    'sp__list_lists',
    'List SharePoint lists on a site',
    {
      siteUrl: z
        .string()
        .describe('The SharePoint site URL (e.g. https://tenant.sharepoint.com/sites/sitename)'),
    },
    async ({ siteUrl }) => {
      try {
        const client = await getClient();
        const result = await client.getLists(siteUrl);
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
              text: `SharePoint API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'sp__get_list_schema',
    'Get column definitions for a SharePoint list',
    {
      siteUrl: z
        .string()
        .describe('The SharePoint site URL'),
      listId: z
        .string()
        .describe('The GUID of the list'),
    },
    async ({ siteUrl, listId }) => {
      try {
        const client = await getClient();
        const result = await client.getListSchema(siteUrl, listId);
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
              text: `SharePoint API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'sp__get_column_formatting',
    'Get column formatting JSON for a SharePoint list field',
    {
      siteUrl: z
        .string()
        .describe('The SharePoint site URL'),
      listId: z
        .string()
        .describe('The GUID of the list'),
      fieldId: z
        .string()
        .describe('The GUID of the field'),
    },
    async ({ siteUrl, listId, fieldId }) => {
      try {
        const client = await getClient();
        const result = await client.getColumnFormatting(siteUrl, listId, fieldId);
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
              text: `SharePoint API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'sp__update_column_formatting',
    'Update column formatting for a SharePoint list field',
    {
      siteUrl: z
        .string()
        .describe('The SharePoint site URL'),
      listId: z
        .string()
        .describe('The GUID of the list'),
      fieldId: z
        .string()
        .describe('The GUID of the field'),
      formatting: z
        .string()
        .describe('The column formatting JSON as a string'),
    },
    async ({ siteUrl, listId, fieldId, formatting }) => {
      try {
        const client = await getClient();
        const formattingObj = JSON.parse(formatting);
        const result = await client.updateColumnFormatting(
          siteUrl,
          listId,
          fieldId,
          formattingObj
        );
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
              text: `SharePoint API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'sp__get_permissions',
    'Get site permissions for a SharePoint site',
    {
      siteUrl: z
        .string()
        .describe('The SharePoint site URL'),
    },
    async ({ siteUrl }) => {
      try {
        const client = await getClient();
        const result = await client.getPermissions(siteUrl);
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
              text: `SharePoint API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
