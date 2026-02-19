import { authStore } from '../auth-store';

export function getStatusToolDefs() {
  return [
    {
      name: 'get_auth_status',
      description: 'Get authentication status for all M365 services',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
  ];
}

export async function handleStatusTool(name: string, _args: any) {
  try {
    switch (name) {
      case 'get_auth_status':
        return ok(authStore.getStatus());
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
