import * as PA from '../clients/PowerAutomateClient';

export function getPowerAutomateToolDefs() {
  return [
    {
      name: 'pa_get_flow',
      description: 'Get Power Automate flow definition and metadata',
      inputSchema: {
        type: 'object' as const,
        properties: {
          envId: { type: 'string', description: 'Environment ID' },
          flowId: { type: 'string', description: 'Flow ID' },
        },
        required: ['envId', 'flowId'],
      },
    },
    {
      name: 'pa_list_runs',
      description: 'List recent Power Automate flow runs',
      inputSchema: {
        type: 'object' as const,
        properties: {
          envId: { type: 'string', description: 'Environment ID' },
          flowId: { type: 'string', description: 'Flow ID' },
          top: { type: 'number', description: 'Number of runs to retrieve (default 25)' },
        },
        required: ['envId', 'flowId'],
      },
    },
    {
      name: 'pa_get_run',
      description: 'Get details of a specific Power Automate flow run including action results',
      inputSchema: {
        type: 'object' as const,
        properties: {
          envId: { type: 'string', description: 'Environment ID' },
          flowId: { type: 'string', description: 'Flow ID' },
          runId: { type: 'string', description: 'Run ID' },
        },
        required: ['envId', 'flowId', 'runId'],
      },
    },
    {
      name: 'pa_get_failed_runs',
      description: 'Get failed Power Automate flow runs with error details',
      inputSchema: {
        type: 'object' as const,
        properties: {
          envId: { type: 'string', description: 'Environment ID' },
          flowId: { type: 'string', description: 'Flow ID' },
          top: { type: 'number', description: 'Number of runs to retrieve (default 10)' },
        },
        required: ['envId', 'flowId'],
      },
    },
    {
      name: 'pa_update_flow',
      description: 'Update Power Automate flow definition (requires confirm=true)',
      inputSchema: {
        type: 'object' as const,
        properties: {
          envId: { type: 'string', description: 'Environment ID' },
          flowId: { type: 'string', description: 'Flow ID' },
          definition: { type: 'string', description: 'Flow definition as JSON string' },
          confirm: { type: 'boolean', description: 'Must be true to confirm update' },
        },
        required: ['envId', 'flowId', 'definition', 'confirm'],
      },
    },
  ];
}

export async function handlePowerAutomateTool(name: string, args: any) {
  try {
    switch (name) {
      case 'pa_get_flow':
        return ok(await PA.getFlow(args.envId, args.flowId));
      case 'pa_list_runs':
        return ok(await PA.listRuns(args.envId, args.flowId, args.top || 25));
      case 'pa_get_run':
        return ok(await PA.getRun(args.envId, args.flowId, args.runId));
      case 'pa_get_failed_runs':
        return ok(await PA.getFailedRuns(args.envId, args.flowId, args.top || 10));
      case 'pa_update_flow': {
        if (!args.confirm) return err('Must set confirm=true to update flow');
        const def = typeof args.definition === 'string' ? JSON.parse(args.definition) : args.definition;
        return ok(await PA.updateFlow(args.envId, args.flowId, def));
      }
      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e: any) {
    return err(e.message);
  }
}

function ok(data: any) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function err(msg: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
}
