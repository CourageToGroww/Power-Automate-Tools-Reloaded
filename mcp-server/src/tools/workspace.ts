import { getWorkspaceData } from '../relay';

export function getWorkspaceToolDefs() {
  return [
    {
      name: 'ws_get_workspace',
      description: 'Get the active workspace metadata (name, sources, export count)',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'ws_list_sources',
      description: 'List all exported data sources in the active workspace',
      inputSchema: { type: 'object' as const, properties: {} },
    },
    {
      name: 'ws_get_source',
      description: 'Get the full JSON data for a specific exported source by ID or label',
      inputSchema: {
        type: 'object' as const,
        properties: {
          sourceId: { type: 'string', description: 'Source ID or label to retrieve' },
        },
        required: ['sourceId'],
      },
    },
    {
      name: 'ws_search_data',
      description: 'Search across all workspace data for a keyword or pattern',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: { type: 'string', description: 'Search term to find in workspace data' },
        },
        required: ['query'],
      },
    },
  ];
}

export async function handleWorkspaceTool(name: string, args: Record<string, unknown>) {
  try {
    const workspace = getWorkspaceData();

    switch (name) {
      case 'ws_get_workspace': {
        if (!workspace) return err('No workspace loaded. Toggle the MCP relay in the extension.');
        return ok({
          name: workspace.name,
          id: workspace.id,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
          dataSourceCount: workspace.dataSources?.length || 0,
          exportedDataCount: workspace.exportedData?.length || 0,
        });
      }

      case 'ws_list_sources': {
        if (!workspace) return err('No workspace loaded.');
        const sources = (workspace.exportedData || []).map((s: any) => ({
          id: s.id,
          actionId: s.actionId,
          serviceType: s.serviceType,
          label: s.label,
          capturedAt: s.capturedAt,
          itemCount: Array.isArray(s.data) ? s.data.length : 1,
        }));
        return ok({ sources });
      }

      case 'ws_get_source': {
        if (!workspace) return err('No workspace loaded.');
        const sourceId = args.sourceId as string;
        const exported = workspace.exportedData || [];
        const match = exported.find((s: any) =>
          s.id === sourceId || s.label.toLowerCase().includes(sourceId.toLowerCase())
        );
        if (!match) return err(`Source not found: ${sourceId}`);
        return ok(match);
      }

      case 'ws_search_data': {
        if (!workspace) return err('No workspace loaded.');
        const query = (args.query as string).toLowerCase();
        const matches: Array<{ source: string; matches: any[] }> = [];
        for (const source of workspace.exportedData || []) {
          const json = JSON.stringify(source.data);
          if (json.toLowerCase().includes(query)) {
            if (Array.isArray(source.data)) {
              const items = source.data.filter((item: any) =>
                JSON.stringify(item).toLowerCase().includes(query)
              );
              matches.push({ source: source.label, matches: items.slice(0, 10) });
            } else {
              matches.push({ source: source.label, matches: [source.data] });
            }
          }
        }
        return ok(matches);
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
