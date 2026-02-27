export interface ExportAction {
  id: string;
  serviceType: string;
  label: string;
  description: string;
  icon: string;
  endpoint: (context: Record<string, string>) => string;
  headers?: Record<string, string>;
  transform: (data: any) => any;
  requiresContext?: string[];
}

export const EXPORT_ACTIONS: ExportAction[] = [
  // SharePoint
  {
    id: 'sp-list-schema',
    serviceType: 'sharepoint',
    label: 'Get List Schema',
    description: 'Export column definitions, types, and choices',
    icon: 'schema',
    endpoint: (ctx) => `${ctx.siteUrl}/_api/web/lists/getbytitle('${ctx.listTitle}')/fields?$top=500`,
    headers: { 'Accept': 'application/json;odata=nometadata' },
    transform: (data) => data.value.filter((f: any) =>
      !f.Hidden && f.CanBeDeleted !== false &&
      !['ContentType','Attachments','Edit','DocIcon','ItemChildCount','FolderChildCount','_ComplianceFlags'].includes(f.InternalName)
    ).map((f: any) => ({
      Title: f.Title,
      InternalName: f.InternalName,
      Type: f.TypeAsString,
      Choices: f.Choices || null,
    })),
    requiresContext: ['siteUrl', 'listTitle'],
  },
  {
    id: 'sp-list-items',
    serviceType: 'sharepoint',
    label: 'Get List Items',
    description: 'Export all items from the current list',
    icon: 'table',
    endpoint: (ctx) => `${ctx.siteUrl}/_api/web/lists/getbytitle('${ctx.listTitle}')/items?$top=5000`,
    headers: { 'Accept': 'application/json;odata=nometadata' },
    transform: (data) => data.value,
    requiresContext: ['siteUrl', 'listTitle'],
  },
  {
    id: 'sp-site-lists',
    serviceType: 'sharepoint',
    label: 'Get Site Structure',
    description: 'Export all lists and libraries on this site',
    icon: 'sitemap',
    endpoint: (ctx) => `${ctx.siteUrl}/_api/web/lists?$filter=Hidden eq false&$top=100`,
    headers: { 'Accept': 'application/json;odata=nometadata' },
    transform: (data) => data.value.map((l: any) => ({
      Title: l.Title,
      Id: l.Id,
      ItemCount: l.ItemCount,
      BaseTemplate: l.BaseTemplate,
      Created: l.Created,
      LastItemModifiedDate: l.LastItemModifiedDate,
    })),
    requiresContext: ['siteUrl'],
  },

  // Power Automate
  {
    id: 'pa-flow-definition',
    serviceType: 'power-automate',
    label: 'Get Flow Definition',
    description: 'Export the full flow JSON definition',
    icon: 'code',
    endpoint: (ctx) => `providers/Microsoft.ProcessSimple/environments/${ctx.envId}/flows/${ctx.flowId}?$expand=properties.connectionReferences`,
    transform: (data) => data,
    requiresContext: ['envId', 'flowId'],
  },
  {
    id: 'pa-flow-runs',
    serviceType: 'power-automate',
    label: 'Get Run History',
    description: 'Export recent flow run history with status',
    icon: 'history',
    endpoint: (ctx) => `providers/Microsoft.ProcessSimple/environments/${ctx.envId}/flows/${ctx.flowId}/runs?$top=50`,
    transform: (data) => data.value,
    requiresContext: ['envId', 'flowId'],
  },
  {
    id: 'pa-connections',
    serviceType: 'power-automate',
    label: 'Get Connections',
    description: 'Export all connections in this environment',
    icon: 'plug',
    endpoint: (ctx) => `providers/Microsoft.ProcessSimple/environments/${ctx.envId}/connections?api-version=2016-11-01`,
    transform: (data) => data.value,
    requiresContext: ['envId'],
  },

  // Forms
  {
    id: 'forms-structure',
    serviceType: 'forms',
    label: 'Get Form Structure',
    description: 'Export form questions, types, and branching',
    icon: 'form',
    endpoint: (ctx) => `https://forms.office.com/formapi/api/${ctx.tenantId}/users/${ctx.userId}/forms('${ctx.formId}')/questions`,
    transform: (data) => data.value,
    requiresContext: ['formId', 'tenantId', 'userId'],
  },
  {
    id: 'forms-responses',
    serviceType: 'forms',
    label: 'Get Form Responses',
    description: 'Export all form responses',
    icon: 'responses',
    endpoint: (ctx) => `https://forms.office.com/formapi/api/${ctx.tenantId}/users/${ctx.userId}/forms('${ctx.formId}')/responses`,
    transform: (data) => data.value,
    requiresContext: ['formId', 'tenantId', 'userId'],
  },

  // Intune
  {
    id: 'intune-devices',
    serviceType: 'intune',
    label: 'Get Managed Devices',
    description: 'Export all managed device details',
    icon: 'devices',
    endpoint: () => 'https://graph.microsoft.com/v1.0/deviceManagement/managedDevices',
    transform: (data) => data.value,
  },
  {
    id: 'intune-compliance',
    serviceType: 'intune',
    label: 'Get Compliance Policies',
    description: 'Export device compliance policies',
    icon: 'shield',
    endpoint: () => 'https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies',
    transform: (data) => data.value,
  },
  {
    id: 'intune-config-profiles',
    serviceType: 'intune',
    label: 'Get Config Profiles',
    description: 'Export device configuration profiles',
    icon: 'settings',
    endpoint: () => 'https://graph.microsoft.com/v1.0/deviceManagement/deviceConfigurations',
    transform: (data) => data.value,
  },

  // Graph API
  {
    id: 'graph-me',
    serviceType: 'graph',
    label: 'Get My Profile',
    description: 'Export your user profile, roles, and licenses',
    icon: 'user',
    endpoint: () => 'https://graph.microsoft.com/v1.0/me?$select=displayName,mail,jobTitle,department,officeLocation,userPrincipalName',
    transform: (data) => data,
  },
  {
    id: 'graph-users',
    serviceType: 'graph',
    label: 'Get Users',
    description: 'Export directory users',
    icon: 'users',
    endpoint: () => 'https://graph.microsoft.com/v1.0/users?$top=999&$select=displayName,mail,jobTitle,department,userPrincipalName,accountEnabled',
    transform: (data) => data.value,
  },
  {
    id: 'graph-groups',
    serviceType: 'graph',
    label: 'Get Groups',
    description: 'Export security groups and teams',
    icon: 'group',
    endpoint: () => 'https://graph.microsoft.com/v1.0/groups?$top=999&$select=displayName,description,groupTypes,mail,membershipRule',
    transform: (data) => data.value,
  },
  {
    id: 'graph-apps',
    serviceType: 'graph',
    label: 'Get App Registrations',
    description: 'Export application registrations',
    icon: 'apps',
    endpoint: () => 'https://graph.microsoft.com/v1.0/applications?$top=999&$select=displayName,appId,createdDateTime,signInAudience',
    transform: (data) => data.value,
  },
  {
    id: 'graph-mail-rules',
    serviceType: 'graph',
    label: 'Get Mail Rules',
    description: 'Export inbox rules',
    icon: 'mail',
    endpoint: () => 'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messageRules',
    transform: (data) => data.value,
  },
  {
    id: 'graph-calendar',
    serviceType: 'graph',
    label: 'Get Calendar Events',
    description: 'Export upcoming calendar events',
    icon: 'calendar',
    endpoint: () => 'https://graph.microsoft.com/v1.0/me/events?$top=50&$orderby=start/dateTime&$select=subject,start,end,location,organizer,attendees',
    transform: (data) => data.value,
  },
  {
    id: 'graph-drive',
    serviceType: 'graph',
    label: 'Get OneDrive Files',
    description: 'Export OneDrive root file listing',
    icon: 'folder',
    endpoint: () => 'https://graph.microsoft.com/v1.0/me/drive/root/children?$top=200&$select=name,size,file,folder,lastModifiedDateTime,webUrl',
    transform: (data) => data.value,
  },
  {
    id: 'graph-org',
    serviceType: 'graph',
    label: 'Get Org Structure',
    description: 'Export manager and direct reports chain',
    icon: 'org',
    endpoint: () => 'https://graph.microsoft.com/v1.0/me/directReports?$select=displayName,mail,jobTitle,department',
    transform: (data) => data.value,
  },
];

export function getActionsForService(serviceType: string): ExportAction[] {
  return EXPORT_ACTIONS.filter(a => a.serviceType === serviceType);
}

export function getActionById(id: string): ExportAction | undefined {
  return EXPORT_ACTIONS.find(a => a.id === id);
}
