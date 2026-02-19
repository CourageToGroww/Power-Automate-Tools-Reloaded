import { graphGet } from './GraphClient';

export async function listDevices(top?: number) {
  const endpoint = top
    ? `/deviceManagement/managedDevices?$top=${top}`
    : `/deviceManagement/managedDevices`;
  return graphGet(endpoint, 'intune');
}

export async function getDevice(deviceId: string) {
  return graphGet(`/deviceManagement/managedDevices/${deviceId}`, 'intune');
}

export async function listPolicies() {
  return graphGet(`/deviceManagement/deviceCompliancePolicies`, 'intune');
}

export async function listApps() {
  return graphGet(`/deviceAppManagement/mobileApps`, 'intune');
}

export async function getComplianceStatus(deviceId: string) {
  return graphGet(`/deviceManagement/managedDevices/${deviceId}/deviceCompliancePolicyStates`, 'intune');
}
