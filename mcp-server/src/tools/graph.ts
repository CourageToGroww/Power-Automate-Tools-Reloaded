import { graphGet, graphRequest } from '../clients/GraphClient';

export function getGraphToolDefs() {
  return [
    {
      name: 'graph_query',
      description: 'Execute a custom Microsoft Graph API query',
      inputSchema: {
        type: 'object' as const,
        properties: {
          endpoint: { type: 'string', description: 'Graph API endpoint (e.g., /me/messages)' },
          method: { type: 'string', description: 'HTTP method (default: GET)' },
        },
        required: ['endpoint'],
      },
    },
    {
      name: 'graph_get_me',
      description: 'Get current user profile from Microsoft Graph',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'graph_list_sites',
      description: 'List SharePoint sites',
      inputSchema: {
        type: 'object' as const,
        properties: {
          search: { type: 'string', description: 'Search query for sites' },
        },
      },
    },
    {
      name: 'graph_list_groups',
      description: 'List Microsoft 365 groups',
      inputSchema: {
        type: 'object' as const,
        properties: {
          filter: { type: 'string', description: 'OData filter query' },
        },
      },
    },
    {
      name: 'graph_search',
      description: 'Search across Microsoft 365 using Graph Search API',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search query string' },
          entityTypes: { type: 'string', description: 'Comma-separated entity types (e.g., driveItem,listItem,site)' },
        },
        required: ['query'],
      },
    },
  ];
}

export async function handleGraphTool(name: string, args: any) {
  try {
    switch (name) {
      case 'graph_query':
        return ok(await graphRequest(args.endpoint, args.method || 'GET'));
      case 'graph_get_me':
        return ok(await graphGet('/me'));
      case 'graph_list_sites': {
        const endpoint = args.search
          ? `/sites?search=${encodeURIComponent(args.search)}`
          : '/sites';
        return ok(await graphGet(endpoint));
      }
      case 'graph_list_groups': {
        const endpoint = args.filter
          ? `/groups?$filter=${encodeURIComponent(args.filter)}`
          : '/groups';
        return ok(await graphGet(endpoint));
      }
      case 'graph_search': {
        const body = {
          requests: [
            {
              entityTypes: args.entityTypes ? args.entityTypes.split(',') : ['driveItem'],
              query: { queryString: args.query },
            },
          ],
        };
        return ok(await graphRequest('/search/query', 'POST', body));
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
