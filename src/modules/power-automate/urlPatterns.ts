import { ServiceContext, UrlPattern } from '../../core/modules/ServiceModule.interface';

/** All webRequest URL patterns for Power Automate API endpoints */
export const PA_URL_PATTERNS: UrlPattern[] = [
  { pattern: 'https://*.api.flow.microsoft.com/*' },
  { pattern: 'https://*.api.powerautomate.com/*' },
  { pattern: 'https://*.api.powerapps.com/*' },
  { pattern: 'https://unitedstates.api.powerapps.com/*' },
  { pattern: 'https://europe.api.powerapps.com/*' },
  { pattern: 'https://asia.api.powerapps.com/*' },
  { pattern: 'https://australia.api.powerapps.com/*' },
  { pattern: 'https://india.api.powerapps.com/*' },
  { pattern: 'https://japan.api.powerapps.com/*' },
  { pattern: 'https://canada.api.powerapps.com/*' },
  { pattern: 'https://southamerica.api.powerapps.com/*' },
  { pattern: 'https://unitedkingdom.api.powerapps.com/*' },
  { pattern: 'https://france.api.powerapps.com/*' },
  { pattern: 'https://germany.api.powerapps.com/*' },
  { pattern: 'https://switzerland.api.powerapps.com/*' },
  { pattern: 'https://usgov.api.powerapps.us/*' },
  { pattern: 'https://usgovhigh.api.powerapps.us/*' },
  { pattern: 'https://dod.api.powerapps.us/*' },
];

/** Host permissions needed in manifest.json */
export const PA_HOST_PERMISSIONS = [
  '*://*.flow.microsoft.com/',
  '*://*.make.powerautomate.com/',
  '*://*.make.powerapps.com/',
];

// Patterns for extracting envId and flowId from API request URLs
const API_PATTERNS = [
  /\/providers\/Microsoft\.ProcessSimple\/environments\/(.*)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /\/environments\/(.*)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
];

/**
 * Extract Power Automate context (envId, flowId) from an intercepted API request URL.
 */
export function extractPAContext(
  url: string,
  _headers?: chrome.webRequest.HttpHeader[]
): ServiceContext | null {
  for (const pattern of API_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      const parsedUrl = new URL(url);
      return {
        serviceId: 'power-automate',
        apiUrl: `${parsedUrl.protocol}//${parsedUrl.hostname}/`,
        ids: {
          envId: match[1],
          flowId: match[2],
        },
      };
    }
  }
  return null;
}

// Patterns for extracting flow data from browser tab URLs
const TAB_ENV_PATTERNS = [
  /\/environments\/([a-zA-Z0-9-]*)\//i,
  /environment\/([a-zA-Z0-9-]*)\//i,
  /\/environment=([a-zA-Z0-9-]*)/i,
  /envid=([a-zA-Z0-9-]*)/i,
  /[?&]environmentId=([a-zA-Z0-9-]*)/i,
  /[?&]env=([a-zA-Z0-9-]*)/i,
  /environments%2F([a-zA-Z0-9-]*)/i,
];

const TAB_FLOW_PATTERNS = [
  /flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /flows\/shared\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /flows\/([0-9a-f]{8}%2D[0-9a-f]{4}%2D[0-9a-f]{4}%2D[0-9a-f]{4}%2D[0-9a-f]{12})/i,
  /flows\/shared\/([0-9a-f]{8}%2D[0-9a-f]{4}%2D[0-9a-f]{4}%2D[0-9a-f]{4}%2D[0-9a-f]{12})/i,
  /flow\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /flow\/shared\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /flowid=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /[?&]flowId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /[?&]id=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /flows%2F([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /flows%2Fshared%2F([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /#.*flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  /#.*flows\/shared\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
];

/**
 * Extract flow data from a browser tab URL (as opposed to an API request URL).
 * Returns envId and flowId if found.
 */
export function extractFlowDataFromTabUrl(
  url: string
): { envId: string; flowId: string } | null {
  let envId: string | null = null;
  for (const pattern of TAB_ENV_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      envId = match[1];
      break;
    }
  }
  if (!envId) return null;

  let flowId: string | null = null;
  for (const pattern of TAB_FLOW_PATTERNS) {
    const match = pattern.exec(url);
    if (match) {
      flowId = decodeURIComponent(match[1]);
      break;
    }
  }
  if (!flowId) return null;

  return { envId, flowId };
}
