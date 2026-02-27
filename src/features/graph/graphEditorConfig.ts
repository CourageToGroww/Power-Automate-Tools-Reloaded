/**
 * Graph editor tab configurations.
 * Adding a new Graph feature = adding an entry to GRAPH_TABS.
 */
import type { EditorTabConfig, ServiceContext, SaveResult } from '../../common/types/serviceEditor';

// ── Tab 1: Users ────────────────────────────────────────────────────────────

async function fetchUsers(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  const resp = await client.get(
    '/users?$top=100&$select=id,displayName,mail,userPrincipalName,jobTitle,department,officeLocation,mobilePhone,accountEnabled'
  ) as any;
  return resp?.value || [];
}

// ── Tab 2: Groups ───────────────────────────────────────────────────────────

async function fetchGroups(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  const resp = await client.get(
    '/groups?$top=100&$select=id,displayName,description,mail,groupTypes,membershipRule,visibility,createdDateTime'
  ) as any;
  return resp?.value || [];
}

async function saveGroups(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  const origArr = original as any[];
  const modArr = modified as any[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  const origMap = new Map<string, any>();
  for (const g of origArr) {
    if (g.id) origMap.set(g.id, g);
  }

  for (const group of modArr) {
    if (!group.id) continue;
    const orig = origMap.get(group.id);
    if (!orig || JSON.stringify(orig) === JSON.stringify(group)) continue;

    const { id, createdDateTime, renewedDateTime, '@odata.type': _, ...updateFields } = group;
    try {
      await client.patch(`/groups/${group.id}`, updateFields);
      results.push({ id: group.id, success: true });
    } catch (err: any) {
      results.push({ id: group.id, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} groups updated, ${failures.length} failed`,
      itemResults: results,
    };
  }
  return {
    success: true,
    message: results.length > 0 ? `${results.length} group(s) updated` : 'No changes detected',
    itemResults: results,
  };
}

// ── Tab 3: Teams ────────────────────────────────────────────────────────────

async function fetchTeams(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  const resp = await client.get(
    '/me/joinedTeams?$select=id,displayName,description,isArchived,webUrl'
  ) as any;
  return resp?.value || [];
}

// ── Tab 4: Mail Rules ───────────────────────────────────────────────────────

async function fetchMailRules(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  const resp = await client.get('/me/mailFolders/inbox/messageRules') as any;
  return resp?.value || [];
}

async function saveMailRules(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  const origArr = original as any[];
  const modArr = modified as any[];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  const origMap = new Map<string, any>();
  for (const r of origArr) {
    if (r.id) origMap.set(r.id, r);
  }

  for (const rule of modArr) {
    if (!rule.id) continue;
    const orig = origMap.get(rule.id);
    if (!orig || JSON.stringify(orig) === JSON.stringify(rule)) continue;

    const { id, ...updateFields } = rule;
    try {
      await client.patch(`/me/mailFolders/inbox/messageRules/${rule.id}`, updateFields);
      results.push({ id: rule.id, success: true });
    } catch (err: any) {
      results.push({ id: rule.id, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} rules updated, ${failures.length} failed`,
      itemResults: results,
    };
  }
  return {
    success: true,
    message: results.length > 0 ? `${results.length} rule(s) updated` : 'No changes detected',
    itemResults: results,
  };
}

// ── Tab 5: Calendar Events ──────────────────────────────────────────────────

async function fetchCalendarEvents(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  // Get events for the next 30 days
  const now = new Date();
  const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const startISO = now.toISOString();
  const endISO = future.toISOString();

  const resp = await client.get(
    `/me/calendarView?startDateTime=${startISO}&endDateTime=${endISO}&$top=100&$select=id,subject,start,end,location,organizer,isAllDay,isCancelled,webLink`
  ) as any;
  return resp?.value || [];
}

// ── Tab 6: My Profile ───────────────────────────────────────────────────────

async function fetchMyProfile(ctx: ServiceContext): Promise<unknown> {
  const { client } = ctx;
  if (!client) throw new Error('No Graph client available');

  return await client.get('/me');
}

// ── Export ───────────────────────────────────────────────────────────────────

export const GRAPH_TABS: EditorTabConfig[] = [
  {
    id: 'graph-users',
    label: 'Users',
    description: 'View directory users',
    service: 'graph',
    fetchData: fetchUsers,
    saveData: null,
    readOnly: true,
  },
  {
    id: 'graph-groups',
    label: 'Groups',
    description: 'View and edit directory groups',
    service: 'graph',
    fetchData: fetchGroups,
    saveData: saveGroups,
  },
  {
    id: 'graph-teams',
    label: 'Teams',
    description: 'View joined Microsoft Teams',
    service: 'graph',
    fetchData: fetchTeams,
    saveData: null,
    readOnly: true,
  },
  {
    id: 'graph-mail-rules',
    label: 'Mail Rules',
    description: 'View and edit inbox rules',
    service: 'graph',
    fetchData: fetchMailRules,
    saveData: saveMailRules,
  },
  {
    id: 'graph-calendar',
    label: 'Calendar',
    description: 'View upcoming calendar events (30 days)',
    service: 'graph',
    fetchData: fetchCalendarEvents,
    saveData: null,
    readOnly: true,
  },
  {
    id: 'graph-profile',
    label: 'My Profile',
    description: 'View your profile information',
    service: 'graph',
    fetchData: fetchMyProfile,
    saveData: null,
    readOnly: true,
  },
];
