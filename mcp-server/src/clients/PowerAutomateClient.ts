import fetch from 'node-fetch';
import { authStore } from '../auth-store';

function getCredentials() {
  const cred = authStore.get('power-automate');
  if (!cred) throw new Error('No Power Automate token available');
  return cred;
}

export async function getFlow(envId: string, flowId: string) {
  const cred = getCredentials();
  const url = `${cred.apiUrl}providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}?api-version=2016-11-01`;
  const resp = await fetch(url, { headers: { Authorization: cred.token } });
  if (!resp.ok) throw new Error(`PA API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export async function listRuns(envId: string, flowId: string, top: number = 25) {
  const cred = getCredentials();
  const url = `${cred.apiUrl}providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}/runs?api-version=2016-11-01&$top=${top}`;
  const resp = await fetch(url, { headers: { Authorization: cred.token } });
  if (!resp.ok) throw new Error(`PA API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export async function getRun(envId: string, flowId: string, runId: string) {
  const cred = getCredentials();
  const url = `${cred.apiUrl}providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}/runs/${runId}?api-version=2016-11-01`;
  const resp = await fetch(url, { headers: { Authorization: cred.token } });
  if (!resp.ok) throw new Error(`PA API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export async function getFailedRuns(envId: string, flowId: string, top: number = 10) {
  const cred = getCredentials();
  const url = `${cred.apiUrl}providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}/runs?api-version=2016-11-01&$filter=status eq 'Failed'&$top=${top}`;
  const resp = await fetch(url, { headers: { Authorization: cred.token } });
  if (!resp.ok) throw new Error(`PA API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}

export async function updateFlow(envId: string, flowId: string, definition: any) {
  const cred = getCredentials();
  const url = `${cred.apiUrl}providers/Microsoft.ProcessSimple/environments/${envId}/flows/${flowId}?api-version=2016-11-01`;
  const resp = await fetch(url, {
    method: 'PATCH',
    headers: { Authorization: cred.token, 'Content-Type': 'application/json' },
    body: JSON.stringify(definition),
  });
  if (!resp.ok) throw new Error(`PA API ${resp.status}: ${await resp.text()}`);
  return resp.json();
}
