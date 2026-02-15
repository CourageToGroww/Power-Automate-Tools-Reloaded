import { ServiceApiClient, ServiceCredentials } from '../../../core/modules/ServiceModule.interface';

const DEFAULT_BASE_URL = 'https://forms.office.com';

/**
 * Microsoft Forms API client.
 * Uses the Forms API endpoint at forms.office.com with Bearer token auth.
 */
export class FormsClient implements ServiceApiClient {
  private credentials: ServiceCredentials;
  private baseUrl: string;

  constructor(credentials: ServiceCredentials) {
    this.credentials = credentials;
    // Use apiUrl from credentials if available, otherwise default to forms.office.com
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
          'Authentication failed. Please ensure you are signed in to Microsoft Forms and try again.'
        );
      }
      if (response.status === 403) {
        throw new Error(
          'Access forbidden. Your account may not have the required permissions for this Forms resource.'
        );
      }
      if (response.status === 404) {
        throw new Error(
          'Resource not found. The requested form or resource does not exist.'
        );
      }
      throw new Error(
        `Forms API ${method} ${url} failed: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`
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
