/**
 * SharePoint editor tab configurations.
 * Adding a new SP feature = adding an entry to SHAREPOINT_TABS.
 */
import type { EditorTabConfig, ServiceContext, SaveResult } from '../../common/types/serviceEditor';

// ── Tab 1: List Items ──────────────────────────────────────────────────────

async function fetchItems(ctx: ServiceContext): Promise<unknown> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  const items: any[] = [];
  let nextUrl: string | null = `${siteUrl}/_api/web/lists(guid'${listId}')/items?$top=500`;

  while (nextUrl) {
    const resp = await client.get(nextUrl) as any;
    const batch = resp?.value || [];
    for (const item of batch) {
      const { __metadata, ...fields } = item;
      items.push(fields);
    }
    nextUrl = resp?.['odata.nextLink'] || resp?.['@odata.nextLink'] || null;
    if (items.length >= 5000) break;
  }
  return items;
}

async function saveItems(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  const origArr = original as any[];
  const modArr = modified as any[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  // Build lookup of original items by ID
  const origMap = new Map<number, any>();
  for (const item of origArr) {
    const id = item.Id || item.ID;
    if (id) origMap.set(id, item);
  }

  // Update changed items
  for (const item of modArr) {
    const id = item.Id || item.ID;
    if (!id) continue;
    const orig = origMap.get(id);
    if (!orig) continue; // New item handling could go here later

    // Check if item changed
    if (JSON.stringify(orig) === JSON.stringify(item)) continue;

    // Build update payload (exclude system fields)
    const { Id, ID, Created, Modified, AuthorId, EditorId, GUID, ...updateFields } = item;

    try {
      await client.patch(
        `${siteUrl}/_api/web/lists(guid'${listId}')/items(${id})`,
        updateFields,
      );
      results.push({ id: String(id), success: true });
    } catch (err: any) {
      results.push({ id: String(id), success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} items saved, ${failures.length} failed`,
      itemResults: results,
    };
  }

  return {
    success: true,
    message: `${results.length} item(s) updated successfully`,
    itemResults: results,
  };
}

// ── Tab 2: List Settings ────────────────────────────────────────────────────

async function fetchSettings(ctx: ServiceContext): Promise<unknown> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  const resp = await client.get(
    `${siteUrl}/_api/web/lists(guid'${listId}')?$select=` +
    'Id,Title,Description,EnableVersioning,EnableMinorVersions,MajorVersionLimit,' +
    'EnableModeration,DraftVersionVisibility,EnableAttachments,EnableFolderCreation,' +
    'ContentTypesEnabled,NoCrawl,DefaultDisplayFormUrl,DefaultEditFormUrl,' +
    'DefaultNewFormUrl,DefaultViewUrl,ItemCount,Created,LastItemModifiedDate,' +
    'BaseTemplate,BaseType,Hidden'
  ) as any;

  // Strip metadata
  const { __metadata, ...settings } = resp || {};
  return settings;
}

async function saveSettings(ctx: ServiceContext, _original: unknown, modified: unknown): Promise<SaveResult> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  // Only send writable properties
  const writable = modified as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  const writableKeys = [
    'Title', 'Description', 'EnableVersioning', 'EnableMinorVersions',
    'MajorVersionLimit', 'EnableModeration', 'DraftVersionVisibility',
    'EnableAttachments', 'EnableFolderCreation', 'ContentTypesEnabled',
    'NoCrawl',
  ];

  for (const key of writableKeys) {
    if (key in writable) {
      payload[key] = writable[key];
    }
  }

  try {
    await client.patch(`${siteUrl}/_api/web/lists(guid'${listId}')`, payload);
    return { success: true, message: 'List settings updated successfully' };
  } catch (err: any) {
    return { success: false, message: `Failed to update settings: ${err.message}` };
  }
}

// ── Tab 3: Form Layout ──────────────────────────────────────────────────────

async function fetchFormLayout(ctx: ServiceContext): Promise<unknown> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  try {
    // Get the default content type's form customizer
    const resp = await client.get(
      `${siteUrl}/_api/web/lists(guid'${listId}')/ContentTypes?$filter=Name eq 'Item'&$select=StringId,ClientFormCustomFormatter`
    ) as any;

    const ct = resp?.value?.[0];
    if (!ct) {
      // Try getting the first content type
      const fallback = await client.get(
        `${siteUrl}/_api/web/lists(guid'${listId}')/ContentTypes?$top=1&$select=StringId,ClientFormCustomFormatter`
      ) as any;
      const fb = fallback?.value?.[0];
      if (fb?.ClientFormCustomFormatter) {
        return JSON.parse(fb.ClientFormCustomFormatter);
      }
      return { header: null, body: null, footer: null };
    }

    if (ct.ClientFormCustomFormatter) {
      return JSON.parse(ct.ClientFormCustomFormatter);
    }
    return { header: null, body: null, footer: null };
  } catch {
    return { header: null, body: null, footer: null };
  }
}

async function saveFormLayout(ctx: ServiceContext, _original: unknown, modified: unknown): Promise<SaveResult> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  try {
    // Get the content type ID first
    const ctResp = await client.get(
      `${siteUrl}/_api/web/lists(guid'${listId}')/ContentTypes?$top=1&$select=StringId`
    ) as any;
    const ctId = ctResp?.value?.[0]?.StringId;
    if (!ctId) throw new Error('No content type found');

    const formatterJson = JSON.stringify(modified);
    await client.patch(
      `${siteUrl}/_api/web/lists(guid'${listId}')/ContentTypes('${ctId}')`,
      { ClientFormCustomFormatter: formatterJson },
    );
    return { success: true, message: 'Form layout updated successfully' };
  } catch (err: any) {
    return { success: false, message: `Failed to update form layout: ${err.message}` };
  }
}

// ── Tab 4: Column Formatting ────────────────────────────────────────────────

async function fetchColumnFormatting(ctx: ServiceContext): Promise<unknown> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  const resp = await client.get(
    `${siteUrl}/_api/web/lists(guid'${listId}')/fields?$filter=Hidden eq false&$top=500&$select=InternalName,Title,TypeAsString,CustomFormatter`
  ) as any;

  const columns: Record<string, any> = {};
  for (const field of resp?.value || []) {
    if (!field.InternalName) continue;
    columns[field.InternalName] = {
      title: field.Title,
      type: field.TypeAsString,
      formatter: field.CustomFormatter ? JSON.parse(field.CustomFormatter) : null,
    };
  }
  return columns;
}

async function saveColumnFormatting(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  const origCols = original as Record<string, any>;
  const modCols = modified as Record<string, any>;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  for (const [colName, modCol] of Object.entries(modCols)) {
    const origCol = origCols[colName];
    if (!origCol) continue;

    const origFormatter = JSON.stringify(origCol.formatter);
    const modFormatter = JSON.stringify(modCol.formatter);

    if (origFormatter === modFormatter) continue;

    try {
      await client.patch(
        `${siteUrl}/_api/web/lists(guid'${listId}')/fields/getbytitle('${encodeURIComponent(colName)}')`,
        { CustomFormatter: modCol.formatter ? JSON.stringify(modCol.formatter) : '' },
      );
      results.push({ id: colName, success: true });
    } catch (err: any) {
      results.push({ id: colName, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} columns updated, ${failures.length} failed`,
      itemResults: results,
    };
  }

  return {
    success: true,
    message: results.length > 0 ? `${results.length} column(s) formatting updated` : 'No formatting changes detected',
    itemResults: results,
  };
}

// ── Tab 5: List Schema (read-only) ─────────────────────────────────────────

async function fetchSchema(ctx: ServiceContext): Promise<unknown> {
  const { client, siteUrl, listId } = ctx;
  if (!client || !siteUrl || !listId) throw new Error('Missing siteUrl or listId');

  const resp = await client.get(
    `${siteUrl}/_api/web/lists(guid'${listId}')/fields?$filter=Hidden eq false&$top=500`
  ) as any;

  return (resp?.value || [])
    .filter((f: any) =>
      f.CanBeDeleted !== false &&
      !['ContentType','Attachments','Edit','DocIcon','ItemChildCount','FolderChildCount','_ComplianceFlags'].includes(f.InternalName)
    )
    .map((f: any) => ({
      Title: f.Title,
      InternalName: f.InternalName,
      Type: f.TypeAsString,
      Required: Boolean(f.Required),
      ReadOnly: Boolean(f.ReadOnlyField),
      Choices: f.Choices?.results || f.Choices || null,
      DefaultValue: f.DefaultValue || null,
    }));
}

// ── Export ───────────────────────────────────────────────────────────────────

export const SHAREPOINT_TABS: EditorTabConfig[] = [
  {
    id: 'sp-items',
    label: 'Items',
    description: 'View and edit list items',
    service: 'sharepoint',
    fetchData: fetchItems,
    saveData: saveItems,
    requiresContext: ['siteUrl', 'listId'],
  },
  {
    id: 'sp-schema',
    label: 'Schema',
    description: 'View column definitions and types',
    service: 'sharepoint',
    fetchData: fetchSchema,
    saveData: null,
    readOnly: true,
    requiresContext: ['siteUrl', 'listId'],
  },
  {
    id: 'sp-settings',
    label: 'Settings',
    description: 'View and edit list configuration',
    service: 'sharepoint',
    fetchData: fetchSettings,
    saveData: saveSettings,
    requiresContext: ['siteUrl', 'listId'],
  },
  {
    id: 'sp-form-layout',
    label: 'Form Layout',
    description: 'View and edit list form customization',
    service: 'sharepoint',
    fetchData: fetchFormLayout,
    saveData: saveFormLayout,
    requiresContext: ['siteUrl', 'listId'],
  },
  {
    id: 'sp-column-formatting',
    label: 'Column Formatting',
    description: 'View and edit column formatting JSON',
    service: 'sharepoint',
    fetchData: fetchColumnFormatting,
    saveData: saveColumnFormatting,
    requiresContext: ['siteUrl', 'listId'],
  },
];
