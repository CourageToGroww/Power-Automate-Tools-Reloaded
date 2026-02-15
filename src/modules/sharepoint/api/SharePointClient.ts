import {
  ServiceCredentials,
  ServiceApiClient,
} from '../../../core/modules/ServiceModule.interface';

export class SharePointClient implements ServiceApiClient {
  private credentials: ServiceCredentials;

  constructor(credentials: ServiceCredentials) {
    this.credentials = credentials;
  }

  private getHeaders(): Record<string, string> {
    // Handle both "Bearer xxx" and raw token formats
    const token = this.credentials.token.startsWith('Bearer ')
      ? this.credentials.token
      : `Bearer ${this.credentials.token}`;

    return {
      'Authorization': token,
      'Accept': 'application/json;odata=verbose',
      'Content-Type': 'application/json;odata=verbose',
    };
  }

  private buildUrl(path: string): string {
    // If path already includes full URL, use it as-is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    // Otherwise, append to apiUrl
    const baseUrl = this.credentials.apiUrl;

    // If path starts with /_api, use it directly
    if (path.startsWith('/_api')) {
      return `${baseUrl}${path}`;
    }

    // Otherwise, assume it's a relative path under /_api
    return `${baseUrl}/_api/${path.replace(/^\//, '')}`;
  }

  private async handleResponse(response: Response): Promise<unknown> {
    if (!response.ok) {
      let errorMessage = `SharePoint API error: ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        if (errorData?.error?.message?.value) {
          errorMessage = `SharePoint API error: ${errorData.error.message.value}`;
        } else if (errorData?.error?.message) {
          errorMessage = `SharePoint API error: ${errorData.error.message}`;
        }
      } catch {
        // Could not parse error response
      }

      if (response.status === 401) {
        throw new Error('SharePoint authentication failed. Please refresh the page and try again.');
      } else if (response.status === 403) {
        throw new Error('Access denied. You do not have permission to access this SharePoint resource.');
      } else if (response.status === 404) {
        throw new Error('SharePoint resource not found. The site, list, or item may not exist.');
      }

      throw new Error(errorMessage);
    }

    // Handle empty responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return null;
    }

    const data = await response.json();

    // SharePoint REST API returns data in d property when using verbose mode
    if (data && typeof data === 'object' && 'd' in data) {
      return data.d;
    }

    return data;
  }

  async get(path: string): Promise<unknown> {
    const url = this.buildUrl(path);
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async post(path: string, data: unknown): Promise<unknown> {
    const url = this.buildUrl(path);
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'X-RequestDigest': await this.getRequestDigest(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async patch(path: string, data: unknown): Promise<unknown> {
    const url = this.buildUrl(path);
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'POST', // SharePoint uses POST with X-HTTP-Method for MERGE
      headers: {
        ...headers,
        'X-HTTP-Method': 'MERGE',
        'If-Match': '*',
        'X-RequestDigest': await this.getRequestDigest(),
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(path: string): Promise<unknown> {
    const url = this.buildUrl(path);
    const headers = this.getHeaders();

    const response = await fetch(url, {
      method: 'POST', // SharePoint uses POST with X-HTTP-Method for DELETE
      headers: {
        ...headers,
        'X-HTTP-Method': 'DELETE',
        'If-Match': '*',
        'X-RequestDigest': await this.getRequestDigest(),
      },
    });
    return this.handleResponse(response);
  }

  private async getRequestDigest(): Promise<string> {
    // For SharePoint REST API operations that modify data, we need a request digest
    // This is obtained from /_api/contextinfo
    try {
      const url = `${this.credentials.apiUrl}/_api/contextinfo`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': this.credentials.token.startsWith('Bearer ')
            ? this.credentials.token
            : `Bearer ${this.credentials.token}`,
          'Accept': 'application/json;odata=verbose',
        },
      });

      if (!response.ok) {
        // If we can't get digest, return empty string
        // Some environments may not require it
        return '';
      }

      const data = await response.json();
      return data?.d?.GetContextWebInformation?.FormDigestValue || '';
    } catch {
      // If request digest fails, return empty string
      return '';
    }
  }
}
