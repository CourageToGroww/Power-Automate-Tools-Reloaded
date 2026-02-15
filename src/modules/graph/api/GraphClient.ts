import { ServiceApiClient, ServiceCredentials } from '../../../core/modules/ServiceModule.interface';

const DEFAULT_BASE_URL = 'https://graph.microsoft.com/v1.0';

/**
 * Microsoft Graph API client.
 * Uses the v1.0 endpoint by default, with Bearer token auth from intercepted credentials.
 */
export class GraphClient implements ServiceApiClient {
  private credentials: ServiceCredentials;
  private baseUrl: string;

  constructor(credentials: ServiceCredentials) {
    this.credentials = credentials;
    // Use apiUrl from credentials if available, otherwise default to v1.0
    const raw = credentials.apiUrl?.replace(/\/$/, '');
    this.baseUrl = raw && raw.length > 0
      ? raw
      : DEFAULT_BASE_URL;
  }

  private buildUrl(path: string): string {
    const base = this.baseUrl.replace(/\/$/, '');
    // If path already starts with http, use it as-is (absolute URL)
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  private async request(
    url: string,
    method: string,
    data?: unknown
  ): Promise<unknown> {
    const fullUrl = this.buildUrl(url);
    const headers: Record<string, string> = {
      'Authorization': this.credentials.token.startsWith('Bearer ')
        ? this.credentials.token
        : `Bearer ${this.credentials.token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      if (response.status === 401) {
        throw new Error(
          'Authentication failed. Please ensure you are signed in to a Microsoft 365 service and try again.'
        );
      }
      if (response.status === 403) {
        throw new Error(
          'Access forbidden. Your account may not have the required permissions for this Graph API resource.'
        );
      }
      if (response.status === 404) {
        throw new Error(
          'Resource not found. The requested Graph API endpoint or resource does not exist.'
        );
      }
      throw new Error(
        `Graph API ${method} ${url} failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`
      );
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return null;
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

  async delete(url: string): Promise<unknown> {
    return this.request(url, 'DELETE');
  }
}
