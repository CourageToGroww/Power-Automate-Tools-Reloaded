import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCredentialsFromRelay } from '../auth-store';
import { FormsClient } from '../clients/FormsClient';

const RELAY_URL = process.env.PA_RELAY_URL || 'http://127.0.0.1:8321';

async function getClient(): Promise<FormsClient> {
  let creds = await fetchCredentialsFromRelay(RELAY_URL, 'forms');
  if (!creds) {
    creds = await fetchCredentialsFromRelay(RELAY_URL, 'graph');
  }
  if (!creds) {
    throw new Error(
      'No Forms credentials available. Make sure the relay is running and the extension has forwarded auth tokens.'
    );
  }
  return new FormsClient(creds);
}

export function registerFormsTools(server: McpServer): void {
  server.tool(
    'forms__get_form',
    'Get the structure and metadata of a Microsoft Form',
    {
      formId: z
        .string()
        .describe('The ID of the form'),
    },
    async ({ formId }) => {
      try {
        const client = await getClient();
        const result = await client.getForm(formId);
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
              text: `Forms API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'forms__list_responses',
    'List responses submitted to a Microsoft Form',
    {
      formId: z
        .string()
        .describe('The ID of the form'),
    },
    async ({ formId }) => {
      try {
        const client = await getClient();
        const result = await client.listResponses(formId);
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
              text: `Forms API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'forms__export_responses',
    'Export form responses as JSON',
    {
      formId: z
        .string()
        .describe('The ID of the form'),
    },
    async ({ formId }) => {
      try {
        const client = await getClient();
        const result = await client.exportResponses(formId);
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
              text: `Forms API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
