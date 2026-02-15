import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCredentialsFromRelay } from '../auth-store';
import { IntuneClient } from '../clients/IntuneClient';

const RELAY_URL = process.env.PA_RELAY_URL || 'http://127.0.0.1:8321';

async function getClient(): Promise<IntuneClient> {
  let creds = await fetchCredentialsFromRelay(RELAY_URL, 'intune');
  if (!creds) {
    creds = await fetchCredentialsFromRelay(RELAY_URL, 'graph');
  }
  if (!creds) {
    throw new Error(
      'No Intune credentials available. Make sure the relay is running and the extension has forwarded auth tokens.'
    );
  }
  return new IntuneClient(creds);
}

export function registerIntuneTools(server: McpServer): void {
  server.tool(
    'intune__list_devices',
    'List managed devices in Intune',
    {},
    async () => {
      try {
        const client = await getClient();
        const result = await client.listDevices();
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
              text: `Intune API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'intune__get_device',
    'Get details for a specific managed device',
    {
      deviceId: z
        .string()
        .describe('The ID of the managed device'),
    },
    async ({ deviceId }) => {
      try {
        const client = await getClient();
        const result = await client.getDevice(deviceId);
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
              text: `Intune API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'intune__list_policies',
    'List device compliance policies',
    {},
    async () => {
      try {
        const client = await getClient();
        const result = await client.listCompliancePolicies();
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
              text: `Intune API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  server.tool(
    'intune__get_compliance_status',
    'Get compliance status for a specific device',
    {
      deviceId: z
        .string()
        .describe('The ID of the managed device'),
    },
    async ({ deviceId }) => {
      try {
        const client = await getClient();
        const result = await client.getComplianceStatus(deviceId);
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
              text: `Intune API error: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );
}
