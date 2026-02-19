import { graphGet } from './GraphClient';

export async function getSite(siteId: string) {
  return graphGet(`/sites/${siteId}`, 'sharepoint');
}

export async function listLists(siteId: string) {
  return graphGet(`/sites/${siteId}/lists`, 'sharepoint');
}

export async function getListSchema(siteId: string, listId: string) {
  return graphGet(`/sites/${siteId}/lists/${listId}/columns`, 'sharepoint');
}

export interface ListItemsOptions {
  filter?: string;
  select?: string;
  top?: number;
}

export async function getListItems(siteId: string, listId: string, opts?: ListItemsOptions) {
  const params = new URLSearchParams();
  params.append('expand', 'fields');

  if (opts?.filter) params.append('$filter', opts.filter);
  if (opts?.select) params.append('$select', opts.select);
  if (opts?.top) params.append('$top', opts.top.toString());

  const query = params.toString();
  const endpoint = `/sites/${siteId}/lists/${listId}/items${query ? '?' + query : ''}`;

  return graphGet(endpoint, 'sharepoint');
}

export async function getColumnFormatting(siteId: string, listId: string, columnId: string) {
  return graphGet(`/sites/${siteId}/lists/${listId}/columns/${columnId}`, 'sharepoint');
}

export async function getContentTypes(siteId: string) {
  return graphGet(`/sites/${siteId}/contentTypes`, 'sharepoint');
}

export async function getSitePages(siteId: string) {
  return graphGet(`/sites/${siteId}/pages`, 'sharepoint');
}
