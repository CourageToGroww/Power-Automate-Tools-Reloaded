/**
 * Intune editor tab configurations.
 * Adding a new Intune feature = adding an entry to INTUNE_TABS.
 */
import type { EditorTabConfig, ServiceContext, SaveResult } from '../../common/types/serviceEditor';

// ── Tab 1: Device Configuration Profiles ────────────────────────────────────

async function fetchConfigProfiles(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const resp = await client.get('/deviceManagement/deviceConfigurations?$top=100') as any;
  return (resp?.value || []).map((p: any) => {
    const { 'assignments@odata.context': _ac, ...rest } = p;
    return rest;
  });
}

async function saveConfigProfiles(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const origArr = original as any[];
  const modArr = modified as any[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  const origMap = new Map<string, any>();
  for (const p of origArr) {
    if (p.id) origMap.set(p.id, p);
  }

  for (const profile of modArr) {
    if (!profile.id) continue;
    const orig = origMap.get(profile.id);
    if (!orig) continue;
    if (JSON.stringify(orig) === JSON.stringify(profile)) continue;

    // Strip read-only fields
    const { id, createdDateTime, lastModifiedDateTime, version, '@odata.type': odataType, ...updateFields } = profile;

    try {
      await client.patch(
        `/deviceManagement/deviceConfigurations/${profile.id}`,
        { '@odata.type': odataType, ...updateFields },
      );
      results.push({ id: profile.id, success: true });
    } catch (err: any) {
      results.push({ id: profile.id, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} profiles updated, ${failures.length} failed`,
      itemResults: results,
    };
  }
  return {
    success: true,
    message: results.length > 0 ? `${results.length} profile(s) updated` : 'No changes detected',
    itemResults: results,
  };
}

// ── Tab 2: Compliance Policies ──────────────────────────────────────────────

async function fetchCompliancePolicies(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const resp = await client.get('/deviceManagement/deviceCompliancePolicies?$top=100') as any;
  return resp?.value || [];
}

async function saveCompliancePolicies(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const origArr = original as any[];
  const modArr = modified as any[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  const origMap = new Map<string, any>();
  for (const p of origArr) {
    if (p.id) origMap.set(p.id, p);
  }

  for (const policy of modArr) {
    if (!policy.id) continue;
    const orig = origMap.get(policy.id);
    if (!orig) continue;
    if (JSON.stringify(orig) === JSON.stringify(policy)) continue;

    const { id, createdDateTime, lastModifiedDateTime, version, '@odata.type': odataType, ...updateFields } = policy;

    try {
      await client.patch(
        `/deviceManagement/deviceCompliancePolicies/${policy.id}`,
        { '@odata.type': odataType, ...updateFields },
      );
      results.push({ id: policy.id, success: true });
    } catch (err: any) {
      results.push({ id: policy.id, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} policies updated, ${failures.length} failed`,
      itemResults: results,
    };
  }
  return {
    success: true,
    message: results.length > 0 ? `${results.length} policy(ies) updated` : 'No changes detected',
    itemResults: results,
  };
}

// ── Tab 3: App Protection Policies ──────────────────────────────────────────

async function fetchAppProtectionPolicies(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const resp = await client.get('/deviceAppManagement/managedAppPolicies?$top=100') as any;
  return resp?.value || [];
}

async function saveAppProtectionPolicies(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const origArr = original as any[];
  const modArr = modified as any[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  const origMap = new Map<string, any>();
  for (const p of origArr) {
    if (p.id) origMap.set(p.id, p);
  }

  for (const policy of modArr) {
    if (!policy.id) continue;
    const orig = origMap.get(policy.id);
    if (!orig) continue;
    if (JSON.stringify(orig) === JSON.stringify(policy)) continue;

    const { id, createdDateTime, lastModifiedDateTime, version, '@odata.type': odataType, ...updateFields } = policy;

    try {
      await client.patch(
        `/deviceAppManagement/managedAppPolicies/${policy.id}`,
        { '@odata.type': odataType, ...updateFields },
      );
      results.push({ id: policy.id, success: true });
    } catch (err: any) {
      results.push({ id: policy.id, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} policies updated, ${failures.length} failed`,
      itemResults: results,
    };
  }
  return {
    success: true,
    message: results.length > 0 ? `${results.length} app protection policy(ies) updated` : 'No changes detected',
    itemResults: results,
  };
}

// ── Tab 4: Managed Devices (read-only) ──────────────────────────────────────

async function fetchManagedDevices(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Intune client available');

  const resp = await client.get(
    '/deviceManagement/managedDevices?$top=100&$orderby=deviceName'
  ) as any;
  return resp?.value || [];
}

// ── Export ───────────────────────────────────────────────────────────────────

export const INTUNE_TABS: EditorTabConfig[] = [
  {
    id: 'intune-config-profiles',
    label: 'Config Profiles',
    description: 'View and edit device configuration profiles',
    service: 'intune',
    fetchData: fetchConfigProfiles,
    saveData: saveConfigProfiles,
  },
  {
    id: 'intune-compliance',
    label: 'Compliance',
    description: 'View and edit compliance policies',
    service: 'intune',
    fetchData: fetchCompliancePolicies,
    saveData: saveCompliancePolicies,
  },
  {
    id: 'intune-app-protection',
    label: 'App Protection',
    description: 'View and edit app protection policies',
    service: 'intune',
    fetchData: fetchAppProtectionPolicies,
    saveData: saveAppProtectionPolicies,
  },
  {
    id: 'intune-devices',
    label: 'Devices',
    description: 'View managed device inventory',
    service: 'intune',
    fetchData: fetchManagedDevices,
    saveData: null,
    readOnly: true,
  },
];
