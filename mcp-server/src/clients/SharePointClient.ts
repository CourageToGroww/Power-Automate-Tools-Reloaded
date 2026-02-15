import { Credentials } from '../types';

export class SharePointClient {
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
  }

  async getLists(siteUrl: string): Promise<unknown> {
    const url = `${siteUrl}/_api/web/lists?$filter=Hidden eq false`;
    return this.request(url, 'GET');
  }

  async getListSchema(siteUrl: string, listId: string): Promise<unknown> {
    const url = `${siteUrl}/_api/web/lists(guid'${listId}')/fields?$filter=Hidden eq false`;
    return this.request(url, 'GET');
  }

  async getColumnFormatting(
    siteUrl: string,
    listId: string,
    fieldId: string
  ): Promise<unknown> {
    const url = `${siteUrl}/_api/web/lists(guid'${listId}')/fields(guid'${fieldId}')`;
    return this.request(url, 'GET');
  }

  async updateColumnFormatting(
    siteUrl: string,
    listId: string,
    fieldId: string,
    formatting: unknown
  ): Promise<unknown> {
    const url = `${siteUrl}/_api/web/lists(guid'${listId}')/fields(guid'${fieldId}')`;
    const body = {
      CustomFormatter: JSON.stringify(formatting),
    };
    return this.request(url, 'PATCH', body);
  }

  async getPermissions(siteUrl: string): Promise<unknown> {
    const url = `${siteUrl}/_api/web/roleassignments?$expand=Member,RoleDefinitionBindings`;
    return this.request(url, 'GET');
  }

  private async request(
    url: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.credentials.token}`,
      Accept: 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose',
    };

    if (method === 'PATCH') {
      headers['IF-MATCH'] = '*';
      headers['X-HTTP-Method'] = 'MERGE';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `SharePoint API ${method} ${url} failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }
}
