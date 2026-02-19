import { useState, useEffect, useCallback } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';

export interface ManagedDevice {
  id: string;
  deviceName: string;
  operatingSystem: string;
  osVersion?: string;
  complianceState: 'compliant' | 'noncompliant' | 'unknown' | 'conflict' | 'error' | 'inGracePeriod' | 'configManager';
  lastSyncDateTime?: string;
  enrolledDateTime?: string;
  model?: string;
  manufacturer?: string;
  serialNumber?: string;
  userPrincipalName?: string;
  userDisplayName?: string;
  managementAgent?: string;
  deviceRegistrationState?: string;
  isEncrypted?: boolean;
  isSupervised?: boolean;
  jailBroken?: string;
  totalStorageSpaceInBytes?: number;
  freeStorageSpaceInBytes?: number;
  managedDeviceOwnerType?: string;
  azureADRegistered?: boolean;
  azureADDeviceId?: string;
  wiFiMacAddress?: string;
  ethernetMacAddress?: string;
  physicalMemoryInBytes?: number;
}

export interface CompliancePolicy {
  id: string;
  displayName: string;
  description?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  version?: number;
  platformType?: string;
  scheduledActionsForRule?: unknown[];
}

export interface DeviceDetail extends ManagedDevice {
  hardwareInformation?: Record<string, unknown>;
  configurationStates?: unknown[];
  compliancePolicyStates?: unknown[];
}

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useDevices() {
  const client = useServiceApi('intune');
  const [state, setState] = useState<AsyncState<ManagedDevice[]>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchDevices = useCallback(async () => {
    if (!client.isReady) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const resp = await client.get('/deviceManagement/managedDevices?$top=50&$orderby=deviceName') as {
        value?: ManagedDevice[];
      };
      const devices: ManagedDevice[] = (resp?.value || []).map((d: any) => ({
        id: String(d.id || ''),
        deviceName: String(d.deviceName || 'Unknown Device'),
        operatingSystem: String(d.operatingSystem || 'Unknown'),
        osVersion: d.osVersion ? String(d.osVersion) : undefined,
        complianceState: (d.complianceState || 'unknown') as ManagedDevice['complianceState'],
        lastSyncDateTime: d.lastSyncDateTime ? String(d.lastSyncDateTime) : undefined,
        enrolledDateTime: d.enrolledDateTime ? String(d.enrolledDateTime) : undefined,
        model: d.model ? String(d.model) : undefined,
        manufacturer: d.manufacturer ? String(d.manufacturer) : undefined,
        serialNumber: d.serialNumber ? String(d.serialNumber) : undefined,
        userPrincipalName: d.userPrincipalName ? String(d.userPrincipalName) : undefined,
        userDisplayName: d.userDisplayName ? String(d.userDisplayName) : undefined,
        managementAgent: d.managementAgent ? String(d.managementAgent) : undefined,
        deviceRegistrationState: d.deviceRegistrationState ? String(d.deviceRegistrationState) : undefined,
        isEncrypted: typeof d.isEncrypted === 'boolean' ? d.isEncrypted : undefined,
        isSupervised: typeof d.isSupervised === 'boolean' ? d.isSupervised : undefined,
        jailBroken: d.jailBroken ? String(d.jailBroken) : undefined,
        totalStorageSpaceInBytes: typeof d.totalStorageSpaceInBytes === 'number' ? d.totalStorageSpaceInBytes : undefined,
        freeStorageSpaceInBytes: typeof d.freeStorageSpaceInBytes === 'number' ? d.freeStorageSpaceInBytes : undefined,
        managedDeviceOwnerType: d.managedDeviceOwnerType ? String(d.managedDeviceOwnerType) : undefined,
        azureADRegistered: typeof d.azureADRegistered === 'boolean' ? d.azureADRegistered : undefined,
        azureADDeviceId: d.azureADDeviceId ? String(d.azureADDeviceId) : undefined,
        wiFiMacAddress: d.wiFiMacAddress ? String(d.wiFiMacAddress) : undefined,
        ethernetMacAddress: d.ethernetMacAddress ? String(d.ethernetMacAddress) : undefined,
        physicalMemoryInBytes: typeof d.physicalMemoryInBytes === 'number' ? d.physicalMemoryInBytes : undefined,
      }));
      setState({ data: devices, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch devices';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [client.isReady]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices: state.data || [],
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchDevices,
    isReady: client.isReady,
  };
}

export function useDevice(deviceId: string | null) {
  const client = useServiceApi('intune');
  const [state, setState] = useState<AsyncState<DeviceDetail>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchDevice = useCallback(async () => {
    if (!client.isReady || !deviceId) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const resp = await client.get(`/deviceManagement/managedDevices/${deviceId}`) as Record<string, unknown>;
      const device: DeviceDetail = {
        id: String(resp.id || ''),
        deviceName: String(resp.deviceName || 'Unknown Device'),
        operatingSystem: String(resp.operatingSystem || 'Unknown'),
        osVersion: resp.osVersion ? String(resp.osVersion) : undefined,
        complianceState: (resp.complianceState || 'unknown') as ManagedDevice['complianceState'],
        lastSyncDateTime: resp.lastSyncDateTime ? String(resp.lastSyncDateTime) : undefined,
        enrolledDateTime: resp.enrolledDateTime ? String(resp.enrolledDateTime) : undefined,
        model: resp.model ? String(resp.model) : undefined,
        manufacturer: resp.manufacturer ? String(resp.manufacturer) : undefined,
        serialNumber: resp.serialNumber ? String(resp.serialNumber) : undefined,
        userPrincipalName: resp.userPrincipalName ? String(resp.userPrincipalName) : undefined,
        userDisplayName: resp.userDisplayName ? String(resp.userDisplayName) : undefined,
        managementAgent: resp.managementAgent ? String(resp.managementAgent) : undefined,
        deviceRegistrationState: resp.deviceRegistrationState ? String(resp.deviceRegistrationState) : undefined,
        isEncrypted: typeof resp.isEncrypted === 'boolean' ? resp.isEncrypted : undefined,
        isSupervised: typeof resp.isSupervised === 'boolean' ? resp.isSupervised : undefined,
        jailBroken: resp.jailBroken ? String(resp.jailBroken) : undefined,
        totalStorageSpaceInBytes: typeof resp.totalStorageSpaceInBytes === 'number' ? resp.totalStorageSpaceInBytes : undefined,
        freeStorageSpaceInBytes: typeof resp.freeStorageSpaceInBytes === 'number' ? resp.freeStorageSpaceInBytes : undefined,
        managedDeviceOwnerType: resp.managedDeviceOwnerType ? String(resp.managedDeviceOwnerType) : undefined,
        azureADRegistered: typeof resp.azureADRegistered === 'boolean' ? resp.azureADRegistered : undefined,
        azureADDeviceId: resp.azureADDeviceId ? String(resp.azureADDeviceId) : undefined,
        wiFiMacAddress: resp.wiFiMacAddress ? String(resp.wiFiMacAddress) : undefined,
        ethernetMacAddress: resp.ethernetMacAddress ? String(resp.ethernetMacAddress) : undefined,
        physicalMemoryInBytes: typeof resp.physicalMemoryInBytes === 'number' ? resp.physicalMemoryInBytes : undefined,
        hardwareInformation: resp.hardwareInformation as Record<string, unknown> | undefined,
        configurationStates: resp.configurationStates as unknown[] | undefined,
        compliancePolicyStates: resp.compliancePolicyStates as unknown[] | undefined,
      };
      setState({ data: device, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch device details';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [client.isReady, deviceId]);

  useEffect(() => {
    if (deviceId) {
      fetchDevice();
    } else {
      setState({ data: null, isLoading: false, error: null });
    }
  }, [deviceId, fetchDevice]);

  return {
    device: state.data,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchDevice,
  };
}

export function usePolicies() {
  const client = useServiceApi('intune');
  const [state, setState] = useState<AsyncState<CompliancePolicy[]>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchPolicies = useCallback(async () => {
    if (!client.isReady) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const resp = await client.get('/deviceManagement/deviceCompliancePolicies?$top=50') as {
        value?: CompliancePolicy[];
      };
      const policies: CompliancePolicy[] = (resp?.value || []).map((p: any) => ({
        id: String(p.id || ''),
        displayName: String(p.displayName || 'Unnamed Policy'),
        description: p.description ? String(p.description) : undefined,
        createdDateTime: p.createdDateTime ? String(p.createdDateTime) : undefined,
        lastModifiedDateTime: p.lastModifiedDateTime ? String(p.lastModifiedDateTime) : undefined,
        version: typeof p.version === 'number' ? p.version : undefined,
        platformType: p['@odata.type'] ? String(p['@odata.type']).replace('#microsoft.graph.', '') : undefined,
        scheduledActionsForRule: p.scheduledActionsForRule as unknown[] | undefined,
      }));
      setState({ data: policies, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch compliance policies';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [client.isReady]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return {
    policies: state.data || [],
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchPolicies,
    isReady: client.isReady,
  };
}
