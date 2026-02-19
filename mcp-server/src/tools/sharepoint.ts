import * as SP from '../clients/SharePointClient';

export function getSharePointToolDefs() {
  return [
    {
      name: 'sp_get_site',
      description: 'Get SharePoint site information',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
        },
        required: ['siteId'],
      },
    },
    {
      name: 'sp_list_lists',
      description: 'List all lists in a SharePoint site',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
        },
        required: ['siteId'],
      },
    },
    {
      name: 'sp_get_list_schema',
      description: 'Get SharePoint list column schema',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
          listId: { type: 'string', description: 'List ID' },
        },
        required: ['siteId', 'listId'],
      },
    },
    {
      name: 'sp_get_list_items',
      description: 'Get items from a SharePoint list',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
          listId: { type: 'string', description: 'List ID' },
          filter: { type: 'string', description: 'OData filter query' },
          select: { type: 'string', description: 'OData select query' },
          top: { type: 'number', description: 'Number of items to retrieve' },
        },
        required: ['siteId', 'listId'],
      },
    },
    {
      name: 'sp_get_column_formatting',
      description: 'Get column formatting configuration',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
          listId: { type: 'string', description: 'List ID' },
          columnId: { type: 'string', description: 'Column ID' },
        },
        required: ['siteId', 'listId', 'columnId'],
      },
    },
    {
      name: 'sp_get_content_types',
      description: 'Get content types for a SharePoint site',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
        },
        required: ['siteId'],
      },
    },
    {
      name: 'sp_get_site_pages',
      description: 'Get site pages from a SharePoint site',
      inputSchema: {
        type: 'object' as const,
        properties: {
          siteId: { type: 'string', description: 'SharePoint site ID' },
        },
        required: ['siteId'],
      },
    },
  ];
}

export async function handleSharePointTool(name: string, args: any) {
  try {
    switch (name) {
      case 'sp_get_site':
        return ok(await SP.getSite(args.siteId));
      case 'sp_list_lists':
        return ok(await SP.listLists(args.siteId));
      case 'sp_get_list_schema':
        return ok(await SP.getListSchema(args.siteId, args.listId));
      case 'sp_get_list_items':
        return ok(await SP.getListItems(args.siteId, args.listId, {
          filter: args.filter,
          select: args.select,
          top: args.top,
        }));
      case 'sp_get_column_formatting':
        return ok(await SP.getColumnFormatting(args.siteId, args.listId, args.columnId));
      case 'sp_get_content_types':
        return ok(await SP.getContentTypes(args.siteId));
      case 'sp_get_site_pages':
        return ok(await SP.getSitePages(args.siteId));
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
