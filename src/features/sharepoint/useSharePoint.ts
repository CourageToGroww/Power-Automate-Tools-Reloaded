import { useState, useEffect, useCallback, useMemo } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';
import { useDataSources } from '../../contexts/DataSourceContext';

export interface SharePointSite {
  id: string;
  displayName: string;
  webUrl: string;
  description?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface SharePointList {
  id: string;
  displayName: string;
  description?: string;
  itemCount: number;
  lastModifiedDateTime?: string;
  createdDateTime?: string;
  list?: {
    template?: string;
    hidden?: boolean;
    contentTypesEnabled?: boolean;
  };
}

export interface SharePointColumn {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  type?: string;
  columnGroup?: string;
  readOnly?: boolean;
  required?: boolean;
  hidden?: boolean;
  indexed?: boolean;
  text?: Record<string, unknown>;
  number?: Record<string, unknown>;
  choice?: { choices?: string[] };
  dateTime?: Record<string, unknown>;
  lookup?: Record<string, unknown>;
  boolean?: Record<string, unknown>;
  calculated?: Record<string, unknown>;
  personOrGroup?: Record<string, unknown>;
}

export interface SharePointListItem {
  id: string;
  fields: Record<string, unknown>;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  createdBy?: { user?: { displayName?: string; email?: string } };
  lastModifiedBy?: { user?: { displayName?: string; email?: string } };
}

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

function useAsyncState<T>(initial: T | null = null): AsyncState<T> & {
  setData: (data: T) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
} {
  const [data, setData] = useState<T | null>(initial);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setData(initial);
    setLoading(false);
    setError(null);
  }, [initial]);

  return { data, isLoading, error, setData, setLoading, setError, reset };
}

/**
 * Parse the active SharePoint DataSource to extract hostname and site path.
 * Returns null if no SP DataSource is active.
 */
function useSpContext(): { baseUrl: string; sitePath: string; listSlug: string | null } | null {
  const { activeSource } = useDataSources();

  return useMemo(() => {
    if (!activeSource || activeSource.serviceType !== 'sharepoint') return null;
    try {
      const url = new URL(activeSource.sourceUrl);
      const hostname = url.hostname;
      const siteMatch = /\/sites\/([^/?#]+)/i.exec(url.pathname);
      if (!siteMatch) return null;
      const sitePath = siteMatch[1];
      const listSlug = activeSource.context.listId || null;
      return {
        baseUrl: `https://${hostname}/sites/${sitePath}`,
        sitePath,
        listSlug,
      };
    } catch {
      return null;
    }
  }, [activeSource]);
}

export function useSites() {
  const client = useServiceApi('sharepoint');
  const state = useAsyncState<SharePointSite[]>([]);
  const spCtx = useSpContext();

  const fetchSites = useCallback(async () => {
    if (!client.isReady) return;
    state.setLoading(true);
    state.setError(null);
    try {
      if (spCtx) {
        // Direct SP REST API: get the specific site we know about
        const resp = await client.get(`${spCtx.baseUrl}/_api/web?$select=Id,Title,Url,Description,Created,LastItemModifiedDate`) as any;
        if (resp) {
          const site: SharePointSite = {
            id: String(resp.Id || resp.id || ''),
            displayName: String(resp.Title || resp.title || spCtx.sitePath),
            webUrl: String(resp.Url || resp.url || spCtx.baseUrl),
            description: resp.Description || resp.description || undefined,
            createdDateTime: resp.Created || resp.created || undefined,
            lastModifiedDateTime: resp.LastItemModifiedDate || resp.lastItemModifiedDate || undefined,
          };
          state.setData([site]);
          return;
        }
      }

      // Fallback: Graph API search (requires graph token)
      const resp = await client.get('/sites?search=*&$top=50') as {
        value?: SharePointSite[];
      };
      const sites = (resp?.value || []).map((s: any) => ({
        id: String(s.id || ''),
        displayName: String(s.displayName || ''),
        webUrl: String(s.webUrl || ''),
        description: s.description ? String(s.description) : undefined,
        createdDateTime: s.createdDateTime ? String(s.createdDateTime) : undefined,
        lastModifiedDateTime: s.lastModifiedDateTime ? String(s.lastModifiedDateTime) : undefined,
      }));
      state.setData(sites);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch sites';
      state.setError(message);
    } finally {
      state.setLoading(false);
    }
  }, [client.isReady, spCtx?.baseUrl]);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return {
    sites: state.data || [],
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchSites,
    isReady: client.isReady,
    spContext: spCtx,
  };
}

export function useLists(siteId: string | null) {
  const client = useServiceApi('sharepoint');
  const state = useAsyncState<SharePointList[]>([]);
  const spCtx = useSpContext();

  const fetchLists = useCallback(async () => {
    if (!client.isReady || !siteId) return;
    state.setLoading(true);
    state.setError(null);
    try {
      if (spCtx) {
        // Direct SP REST API: get lists from the specific site
        const resp = await client.get(
          `${spCtx.baseUrl}/_api/web/lists?$filter=Hidden eq false&$select=Id,Title,Description,ItemCount,LastItemModifiedDate,Created,BaseTemplate&$top=100`
        ) as any;
        const rawLists = resp?.value || [];
        const lists = rawLists.map((l: any) => ({
          id: String(l.Id || l.id || ''),
          displayName: String(l.Title || l.title || ''),
          description: (l.Description || l.description) ? String(l.Description || l.description) : undefined,
          itemCount: typeof (l.ItemCount ?? l.itemCount) === 'number' ? (l.ItemCount ?? l.itemCount) : 0,
          lastModifiedDateTime: l.LastItemModifiedDate || l.lastItemModifiedDate || undefined,
          createdDateTime: l.Created || l.created || undefined,
        }));
        state.setData(lists);
        return;
      }

      // Fallback: Graph API
      const resp = await client.get(`/sites/${siteId}/lists?$expand=list&$top=100`) as {
        value?: SharePointList[];
      };
      const lists = (resp?.value || []).map((l: any) => ({
        id: String(l.id || ''),
        displayName: String(l.displayName || ''),
        description: l.description ? String(l.description) : undefined,
        itemCount: typeof l.itemCount === 'number' ? l.itemCount : 0,
        lastModifiedDateTime: l.lastModifiedDateTime ? String(l.lastModifiedDateTime) : undefined,
        createdDateTime: l.createdDateTime ? String(l.createdDateTime) : undefined,
        list: l.list as SharePointList['list'],
      }));
      state.setData(lists);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch lists';
      state.setError(message);
    } finally {
      state.setLoading(false);
    }
  }, [client.isReady, siteId, spCtx?.baseUrl]);

  useEffect(() => {
    if (siteId) {
      fetchLists();
    } else {
      state.reset();
    }
  }, [siteId, fetchLists]);

  return {
    lists: state.data || [],
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchLists,
  };
}

export interface UseListItemsOptions {
  filter?: string;
  select?: string[];
  top?: number;
}

export function useListItems(
  siteId: string | null,
  listId: string | null,
  options: UseListItemsOptions = {}
) {
  const client = useServiceApi('sharepoint');
  const itemState = useAsyncState<SharePointListItem[]>([]);
  const columnState = useAsyncState<SharePointColumn[]>([]);
  const spCtx = useSpContext();

  const fetchColumns = useCallback(async () => {
    if (!client.isReady || !siteId || !listId) return;
    columnState.setLoading(true);
    columnState.setError(null);
    try {
      if (spCtx) {
        // Direct SP REST API
        const resp = await client.get(
          `${spCtx.baseUrl}/_api/web/lists(guid'${listId}')/fields?$filter=Hidden eq false`
        ) as any;
        const rawCols = resp?.value || [];
        const columns = rawCols.map((c: any) => ({
          id: String(c.Id || c.id || ''),
          name: String(c.InternalName || c.internalName || c.StaticName || ''),
          displayName: String(c.Title || c.title || ''),
          description: (c.Description || c.description) ? String(c.Description || c.description) : undefined,
          type: c.TypeAsString || c.typeAsString || undefined,
          columnGroup: c.Group || c.group || undefined,
          readOnly: Boolean(c.ReadOnlyField ?? c.readOnlyField),
          required: Boolean(c.Required ?? c.required),
          hidden: Boolean(c.Hidden ?? c.hidden),
          indexed: Boolean(c.Indexed ?? c.indexed),
          text: c.TypeAsString === 'Text' || c.TypeAsString === 'Note' ? {} : undefined,
          number: c.TypeAsString === 'Number' || c.TypeAsString === 'Currency' ? {} : undefined,
          choice: c.TypeAsString === 'Choice' ? { choices: c.Choices?.results || c.Choices || [] } : undefined,
          dateTime: c.TypeAsString === 'DateTime' ? {} : undefined,
          lookup: c.TypeAsString === 'Lookup' ? {} : undefined,
          boolean: c.TypeAsString === 'Boolean' ? {} : undefined,
          calculated: c.TypeAsString === 'Calculated' ? {} : undefined,
          personOrGroup: c.TypeAsString === 'User' || c.TypeAsString === 'UserMulti' ? {} : undefined,
        }));
        columnState.setData(columns);
        return;
      }

      // Fallback: Graph API
      const resp = await client.get(`/sites/${siteId}/lists/${listId}/columns`) as {
        value?: SharePointColumn[];
      };
      const columns = (resp?.value || []).map((c: any) => ({
        id: String(c.id || ''),
        name: String(c.name || ''),
        displayName: String(c.displayName || ''),
        description: c.description ? String(c.description) : undefined,
        type: c.type ? String(c.type) : undefined,
        columnGroup: c.columnGroup ? String(c.columnGroup) : undefined,
        readOnly: Boolean(c.readOnly),
        required: Boolean(c.required),
        hidden: Boolean(c.hidden),
        indexed: Boolean(c.indexed),
        text: c.text as SharePointColumn['text'],
        number: c.number as SharePointColumn['number'],
        choice: c.choice as SharePointColumn['choice'],
        dateTime: c.dateTime as SharePointColumn['dateTime'],
        lookup: c.lookup as SharePointColumn['lookup'],
        boolean: c.boolean as SharePointColumn['boolean'],
        calculated: c.calculated as SharePointColumn['calculated'],
        personOrGroup: c.personOrGroup as SharePointColumn['personOrGroup'],
      }));
      columnState.setData(columns);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch columns';
      columnState.setError(message);
    } finally {
      columnState.setLoading(false);
    }
  }, [client.isReady, siteId, listId, spCtx?.baseUrl]);

  const fetchItems = useCallback(async () => {
    if (!client.isReady || !siteId || !listId) return;
    itemState.setLoading(true);
    itemState.setError(null);
    try {
      if (spCtx) {
        // Direct SP REST API
        const top = options.top ? Math.min(options.top, 50) : 50;
        let apiUrl = `${spCtx.baseUrl}/_api/web/lists(guid'${listId}')/items?$top=${top}`;
        if (options.filter) {
          apiUrl += `&$filter=${encodeURIComponent(options.filter)}`;
        }

        const resp = await client.get(apiUrl) as any;
        const rawItems = resp?.value || [];
        const items = rawItems.map((item: any) => {
          // SP REST API returns flat fields directly on the item object
          const { Id, ID, Created, Modified, AuthorId, EditorId, ...fields } = item;
          return {
            id: String(Id || ID || item.id || ''),
            fields: fields as Record<string, unknown>,
            createdDateTime: Created || item.created || undefined,
            lastModifiedDateTime: Modified || item.modified || undefined,
          };
        });
        itemState.setData(items);
        return;
      }

      // Fallback: Graph API
      const params: string[] = [];
      params.push('$expand=fields');
      if (options.top) {
        params.push(`$top=${Math.min(options.top, 50)}`);
      } else {
        params.push('$top=50');
      }
      if (options.filter) {
        params.push(`$filter=${encodeURIComponent(options.filter)}`);
      }
      if (options.select && options.select.length > 0) {
        params.push(`$select=${options.select.join(',')}`);
      }

      const queryString = params.join('&');
      const resp = await client.get(`/sites/${siteId}/lists/${listId}/items?${queryString}`) as {
        value?: SharePointListItem[];
      };
      const items = (resp?.value || []).map((item: any) => ({
        id: String(item.id || ''),
        fields: (item.fields || {}) as Record<string, unknown>,
        createdDateTime: item.createdDateTime ? String(item.createdDateTime) : undefined,
        lastModifiedDateTime: item.lastModifiedDateTime ? String(item.lastModifiedDateTime) : undefined,
        createdBy: item.createdBy as SharePointListItem['createdBy'],
        lastModifiedBy: item.lastModifiedBy as SharePointListItem['lastModifiedBy'],
      }));
      itemState.setData(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch list items';
      itemState.setError(message);
    } finally {
      itemState.setLoading(false);
    }
  }, [client.isReady, siteId, listId, options.filter, options.select?.join(','), options.top, spCtx?.baseUrl]);

  useEffect(() => {
    if (siteId && listId) {
      fetchColumns();
      fetchItems();
    } else {
      columnState.reset();
      itemState.reset();
    }
  }, [siteId, listId, fetchColumns, fetchItems]);

  return {
    items: itemState.data || [],
    columns: columnState.data || [],
    isLoadingItems: itemState.isLoading,
    isLoadingColumns: columnState.isLoading,
    itemsError: itemState.error,
    columnsError: columnState.error,
    refetchItems: fetchItems,
    refetchColumns: fetchColumns,
  };
}
