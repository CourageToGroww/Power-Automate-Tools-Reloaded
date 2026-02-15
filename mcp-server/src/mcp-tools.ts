import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { fetchCredentialsFromRelay } from './auth-store';
import { PowerAutomateClient } from './power-automate-client';

const RELAY_URL = process.env.PA_RELAY_URL || 'http://127.0.0.1:8321';

async function getClient(): Promise<PowerAutomateClient> {
  const creds = await fetchCredentialsFromRelay(RELAY_URL, 'power-automate');
  if (!creds) {
    throw new Error(
      'No Power Automate credentials available. Make sure the relay is running and the extension has forwarded auth tokens.'
    );
  }
  return new PowerAutomateClient(creds);
}

export function registerTools(server: McpServer): void {
  // pa__get_auth_status - Check if relay has valid credentials
  server.tool(
    'pa__get_auth_status',
    'Check if the relay has valid Power Automate credentials',
    {},
    async () => {
      try {
        const response = await fetch(`${RELAY_URL}/api/status`);
        if (!response.ok) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Relay not reachable: HTTP ${response.status}`,
              },
            ],
          };
        }
        const status = await response.json();
        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(status, null, 2) },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Cannot reach relay at ${RELAY_URL}: ${err instanceof Error ? err.message : String(err)}`,
            },
          ],
        };
      }
    }
  );

  // pa__get_flow - Get current flow definition
  server.tool(
    'pa__get_flow',
    'Get the current Power Automate flow definition including triggers, actions, and connections',
    {},
    async () => {
      const client = await getClient();
      const flow = await client.getFlow();
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(flow, null, 2) },
        ],
      };
    }
  );

  // pa__list_runs - List recent runs with optional status filter
  server.tool(
    'pa__list_runs',
    'List recent Power Automate flow runs with optional status filter',
    {
      status: z
        .enum(['Running', 'Succeeded', 'Failed', 'Cancelled', 'Skipped'])
        .optional()
        .describe('Filter runs by status'),
      top: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of runs to return (default 25, max 100)'),
    },
    async ({ status, top }) => {
      const client = await getClient();
      const runs = await client.listRuns(status, top);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(runs, null, 2) },
        ],
      };
    }
  );

  // pa__get_run - Get run details including all action results
  server.tool(
    'pa__get_run',
    'Get detailed information about a specific Power Automate flow run including action results',
    {
      runId: z.string().describe('The run ID (name) to get details for'),
    },
    async ({ runId }) => {
      const client = await getClient();
      const run = await client.getRun(runId);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(run, null, 2) },
        ],
      };
    }
  );

  // pa__get_failed_runs - Get failed runs with error details
  server.tool(
    'pa__get_failed_runs',
    'Get recent failed Power Automate flow runs with error details per action',
    {
      top: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .describe('Number of failed runs to return (default 10)'),
    },
    async ({ top }) => {
      const client = await getClient();
      const failedRuns = await client.getFailedRuns(top);

      const detailed = await Promise.all(
        failedRuns.slice(0, 5).map(async (run) => {
          try {
            const details = await client.getRun(run.name);
            const failedActions = details.properties.actions
              ? Object.entries(details.properties.actions)
                  .filter(([, action]) => action.status === 'Failed')
                  .map(([name, action]) => ({
                    name,
                    error: action.error,
                    code: action.code,
                    startTime: action.startTime,
                    endTime: action.endTime,
                  }))
              : [];

            return {
              runId: run.name,
              status: run.properties.status,
              startTime: run.properties.startTime,
              endTime: run.properties.endTime,
              failedActions,
            };
          } catch {
            return {
              runId: run.name,
              status: run.properties.status,
              startTime: run.properties.startTime,
              error: 'Could not fetch run details',
            };
          }
        })
      );

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(
              { totalFailed: failedRuns.length, runs: detailed },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // pa__get_action_details - Get inputs/outputs for a specific action in a run
  server.tool(
    'pa__get_action_details',
    'Get detailed inputs and outputs for a specific action in a Power Automate flow run',
    {
      runId: z.string().describe('The run ID'),
      actionName: z.string().describe('The action name to get details for'),
    },
    async ({ runId, actionName }) => {
      const client = await getClient();
      const details = await client.getActionDetails(runId, actionName);
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(details, null, 2) },
        ],
      };
    }
  );

  // pa__update_flow - Update flow definition (requires confirm: true)
  server.tool(
    'pa__update_flow',
    'Update the Power Automate flow definition. Requires confirm: true to execute.',
    {
      definition: z
        .record(z.string(), z.unknown())
        .describe('The new flow definition object'),
      confirm: z
        .boolean()
        .describe('Must be set to true to confirm the update'),
    },
    async ({ definition, confirm }) => {
      if (!confirm) {
        return {
          content: [
            {
              type: 'text' as const,
              text: 'Update not confirmed. Set confirm: true to execute the flow update.',
            },
          ],
        };
      }

      const client = await getClient();
      const result = await client.updateFlow(definition);
      return {
        content: [
          {
            type: 'text' as const,
            text: `Flow updated successfully.\n${JSON.stringify(result, null, 2)}`,
          },
        ],
      };
    }
  );
}
