import { ServiceApiClient, ServiceCredentials } from '../../../core/modules/ServiceModule.interface';

const PA_API_VERSION = '2016-11-01';

/**
 * Power Automate API client.
 * Mirrors the existing ApiProvider logic with api-version query param.
 */
export class PowerAutomateClient implements ServiceApiClient {
  private credentials: ServiceCredentials;

  constructor(credentials: ServiceCredentials) {
    this.credentials = credentials;
  }

  private buildUrl(path: string): string {
    const base = this.credentials.apiUrl.replace(/\/$/, '');
    const separator = path.includes('?') ? '&' : '?';
    return `${base}${path}${separator}api-version=${PA_API_VERSION}`;
  }

  private async request(
    url: string,
    method: string,
    data?: unknown
  ): Promise<unknown> {
    const fullUrl = this.buildUrl(url);
    const response = await fetch(fullUrl, {
      method,
      headers: {
        authorization: this.credentials.token,
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 401) {
        throw new Error('Authentication failed. Please refresh the Power Automate page and try again.');
      }
      if (response.status === 403) {
        throw new Error('Access forbidden. You may not have permission to modify this flow.');
      }
      if (response.status === 404) {
        throw new Error('Flow not found. It may have been deleted or moved.');
      }
      throw new Error(
        `PA API ${method} failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  async get(url: string): Promise<unknown> {
    return this.request(url, 'GET');
  }

  async patch(url: string, data: unknown): Promise<unknown> {
    return this.request(url, 'PATCH', data);
  }

  async post(url: string, data: unknown): Promise<unknown> {
    return this.request(url, 'POST', data);
  }
}
