import { Credentials } from '../types';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export class FormsClient {
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;
  }

  async getForm(formId: string): Promise<unknown> {
    return this.query(`/forms('${formId}')`);
  }

  async listResponses(formId: string): Promise<unknown> {
    return this.query(`/forms('${formId}')/responses`);
  }

  async exportResponses(formId: string): Promise<unknown> {
    return this.query(`/forms('${formId}')/responses`);
  }

  private async query(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<unknown> {
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${GRAPH_BASE_URL}${path}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.credentials.token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `Forms API ${method} ${path} failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }
}
