export type ServiceType =
  | 'power-automate'
  | 'sharepoint'
  | 'intune'
  | 'forms'
  | 'graph'
  | 'teams'
  | 'unknown';

export interface ServiceContext {
  service: ServiceType;
  siteId?: string;
  listId?: string;
  envId?: string;
  flowId?: string;
  deviceId?: string;
  formId?: string;
  tenantId?: string;
  rawUrl?: string;
}

interface UrlPattern {
  service: ServiceType;
  patterns: RegExp[];
}

const URL_PATTERNS: UrlPattern[] = [
  {
    service: 'power-automate',
    patterns: [
      /\.api\.flow\.microsoft\.com/i,
      /\.api\.powerautomate\.com/i,
      /\.api\.powerapps\.com/i,
      /make\.powerautomate\.com/i,
      /make\.powerapps\.com/i,
      /flow\.microsoft\.com/i,
    ],
  },
  {
    service: 'sharepoint',
    patterns: [
      /\.sharepoint\.com/i,
    ],
  },
  {
    service: 'intune',
    patterns: [
      /intune\.microsoft\.com/i,
      /\.manage\.microsoft\.com/i,
    ],
  },
  {
    service: 'forms',
    patterns: [
      /forms\.office\.com/i,
      /forms\.microsoft\.com/i,
    ],
  },
  {
    service: 'teams',
    patterns: [
      /admin\.teams\.microsoft\.com/i,
    ],
  },
  {
    service: 'graph',
    patterns: [
      /graph\.microsoft\.com/i,
    ],
  },
];

export function detectService(url: string): { service: ServiceType; context: ServiceContext } {
  for (const entry of URL_PATTERNS) {
    for (const pattern of entry.patterns) {
      if (pattern.test(url)) {
        const context = extractServiceContext(entry.service, url);
        return { service: entry.service, context };
      }
    }
  }
  return { service: 'unknown', context: { service: 'unknown', rawUrl: url } };
}

function extractServiceContext(service: ServiceType, url: string): ServiceContext {
  const ctx: ServiceContext = { service, rawUrl: url };

  switch (service) {
    case 'power-automate': {
      const envMatch = /environments\/([a-zA-Z0-9-]+)/i.exec(url);
      if (envMatch) ctx.envId = envMatch[1];

      const flowMatch = /flows\/(?:shared\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i.exec(url);
      if (flowMatch) ctx.flowId = flowMatch[1];
      break;
    }

    case 'sharepoint': {
      const siteMatch = /sites\/([^/?#]+)/i.exec(url);
      if (siteMatch) ctx.siteId = decodeURIComponent(siteMatch[1]);

      const listMatch = /lists\/([^/?#]+)/i.exec(url);
      if (listMatch) ctx.listId = decodeURIComponent(listMatch[1]);
      break;
    }

    case 'intune': {
      const deviceMatch = /managedDevices\/([a-zA-Z0-9-]+)/i.exec(url);
      if (deviceMatch) ctx.deviceId = deviceMatch[1];
      break;
    }

    case 'forms': {
      const formMatch = /forms\/([a-zA-Z0-9-]+)/i.exec(url);
      if (formMatch) ctx.formId = formMatch[1];
      break;
    }
  }

  const tenantMatch = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i.exec(url);
  if (tenantMatch) ctx.tenantId = tenantMatch[1];

  return ctx;
}

/** URL filters for chrome.webRequest to capture tokens from all M365 services */
export const ALL_M365_URL_FILTERS: string[] = [
  // Power Automate
  "https://*.api.flow.microsoft.com/*",
  "https://*.api.powerautomate.com/*",
  "https://*.api.powerapps.com/*",
  "https://unitedstates.api.powerapps.com/*",
  "https://europe.api.powerapps.com/*",
  "https://asia.api.powerapps.com/*",
  "https://australia.api.powerapps.com/*",
  "https://india.api.powerapps.com/*",
  "https://japan.api.powerapps.com/*",
  "https://canada.api.powerapps.com/*",
  "https://southamerica.api.powerapps.com/*",
  "https://unitedkingdom.api.powerapps.com/*",
  "https://france.api.powerapps.com/*",
  "https://germany.api.powerapps.com/*",
  "https://switzerland.api.powerapps.com/*",
  "https://usgov.api.powerapps.us/*",
  "https://usgovhigh.api.powerapps.us/*",
  "https://dod.api.powerapps.us/*",
  // Graph API
  "https://graph.microsoft.com/*",
  // SharePoint
  "https://*.sharepoint.com/*",
  // Intune / Device Management
  "https://intune.microsoft.com/*",
  "https://*.manage.microsoft.com/*",
  // Forms
  "https://forms.office.com/*",
  "https://forms.microsoft.com/*",
  // Teams Admin
  "https://admin.teams.microsoft.com/*",
  // General Office
  "https://*.office.com/*",
  "https://*.office365.com/*",
];
