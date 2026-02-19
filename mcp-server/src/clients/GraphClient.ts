import fetch from 'node-fetch';
import { authStore, ServiceType } from '../auth-store';

export async function graphGet(endpoint: string, service: ServiceType = 'graph'): Promise<any> {
  // Try the specific service token first, fall back to 'graph'
  const cred = authStore.get(service) || authStore.get('graph');
  if (!cred) throw new Error(`No token available for ${service}`);

  const url = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`;
  const resp = await fetch(url, { headers: { Authorization: cred.token } });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`Graph API ${resp.status}: ${errText}`);
  }
  return resp.json();
}

export async function graphRequest(
  endpoint: string,
  method: string = 'GET',
  body?: any,
  service: ServiceType = 'graph'
): Promise<any> {
  const cred = authStore.get(service) || authStore.get('graph');
  if (!cred) throw new Error(`No token available for ${service}`);

  const url = endpoint.startsWith('http') ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`;
  const options: any = {
    method,
    headers: { Authorization: cred.token, 'Content-Type': 'application/json' },
  };

  if (body) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const resp = await fetch(url, options);
  if (!resp.ok) {
    const errText = await resp.text().catch(() => resp.statusText);
    throw new Error(`Graph API ${resp.status}: ${errText}`);
  }

  // Handle 204 No Content
  if (resp.status === 204) return null;

  return resp.json();
}
