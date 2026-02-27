import { Actions, ExecuteExportAction, ExportAllForWorkspace } from "./common/types/backgroundActions";
import { TokenStore } from "./common/services/TokenStore";
import { detectService, ALL_M365_URL_FILTERS, ServiceType, ServiceContext } from "./common/services/ServiceDetector";
import { DataSource } from "./common/types/dataSource";
import { getActionById, getActionsForService } from "./common/types/exportActions";

interface LegacyState {
  url?: URL;
  initiatorTabId?: number;
  appTabId?: number;
  lastMatchedRequest?: { envId: string; flowId: string } | null;
}

const legacyState: LegacyState = {};
const tokenStore = new TokenStore();

// Data source capture state
let pendingSources: DataSource[] = [];

// Cached flow definitions captured by content scripts
interface CachedFlowEntry {
  envId: string;
  flowId: string;
  displayName: string;
  flowData: any;
  capturedAt: number;
}
const flowDefinitionCache = new Map<string, CachedFlowEntry>();

function cacheFlowDefinition(envId: string, flowId: string, flowData: any) {
  const key = `${envId}:${flowId}`;
  const displayName = flowData?.properties?.displayName || `Flow ${flowId.substring(0, 8)}`;
  flowDefinitionCache.set(key, {
    envId,
    flowId,
    displayName,
    flowData,
    capturedAt: Date.now(),
  });
  debugLog('Cached flow definition:', displayName, `(${key})`);
}

// Relay state
let relayEnabled = false;
let relayTransport: 'native' | 'http' | 'none' = 'none';
let nativePort: chrome.runtime.Port | null = null;

const DEBUG = true;

function debugLog(...args: any[]) {
  if (DEBUG) console.log('[M365-Workbench BG]', ...args);
}

function debugError(...args: any[]) {
  if (DEBUG) console.error('[M365-Workbench BG Error]', ...args);
}

// Restore relay state from storage
chrome.storage.local.get(['relayEnabled'], (result) => {
  if (result.relayEnabled) {
    relayEnabled = true;
    connectRelay();
  }
});

chrome.action.enable();
debugLog('Extension initialized');

// ─── Extension icon click ───────────────────────────────────────────────────

chrome.action.onClicked.addListener((tab) => {
  debugLog('Extension clicked, tab:', tab.url, 'tab.id:', tab.id);

  // Build a DataSource from the current tab
  const source = buildDataSourceFromTab(tab);

  if (source) {
    debugLog('Built data source:', source.serviceType, source.label);

    // Also update legacy state for backward compat with PA flow editor
    if (source.serviceType === 'power-automate' && source.context.envId && source.context.flowId) {
      legacyState.lastMatchedRequest = {
        envId: source.context.envId,
        flowId: source.context.flowId,
      };
      legacyState.initiatorTabId = tab.id;
    }
  } else {
    debugLog('No service detected from tab URL, opening workbench anyway');
  }

  // Always open or focus the workbench tab, even if no service was detected.
  // The old behavior always opened a tab; the workbench shows instructions if no data is available.
  sendToAppTabOrQueue(source);
});

function buildDataSourceFromTab(tab: chrome.tabs.Tab): DataSource | null {
  if (!tab.url) return null;

  const { service, context } = detectService(tab.url);
  if (service === 'unknown') return null;

  // Convert ServiceContext to Record<string, string> for DataSource
  const ctxRecord: Record<string, string> = {};
  if (context.envId) ctxRecord.envId = context.envId;
  if (context.flowId) ctxRecord.flowId = context.flowId;
  if (context.siteId) ctxRecord.siteId = context.siteId;
  if (context.listId) ctxRecord.listId = context.listId;
  if (context.deviceId) ctxRecord.deviceId = context.deviceId;
  if (context.formId) ctxRecord.formId = context.formId;
  if (context.tenantId) ctxRecord.tenantId = context.tenantId;

  // For PA, also try to extract envId/flowId from the browser URL if not found in API URL patterns
  if (service === 'power-automate' && (!ctxRecord.envId || !ctxRecord.flowId)) {
    const extracted = extractFlowDataFromTabUrl(tab.url);
    if (extracted) {
      ctxRecord.envId = extracted.envId;
      ctxRecord.flowId = extracted.flowId;
    }
  }

  return {
    id: crypto.randomUUID(),
    serviceType: service,
    context: ctxRecord,
    label: deriveSourceLabel(service, ctxRecord, tab.title),
    sourceUrl: tab.url,
    originTabId: tab.id,
    capturedAt: Date.now(),
  };
}

function deriveSourceLabel(
  service: string,
  context: Record<string, string>,
  tabTitle?: string
): string {
  // Try to derive a meaningful label from context
  if (service === 'sharepoint' && context.listId) {
    return context.listId;
  }
  if (service === 'sharepoint' && context.siteId) {
    return context.siteId;
  }
  if (service === 'forms' && context.formId) {
    return `Form ${context.formId.substring(0, 8)}`;
  }
  if (service === 'power-automate' && context.flowId) {
    return `Flow ${context.flowId.substring(0, 8)}`;
  }

  // Fall back to cleaned tab title
  if (tabTitle) {
    return tabTitle
      .replace(/\s*[-|]\s*(Microsoft|SharePoint|Power Automate|Intune|Forms).*$/i, '')
      .trim() || tabTitle.substring(0, 50);
  }

  return service;
}

function sendToAppTabOrQueue(source: DataSource | null) {
  if (legacyState.appTabId) {
    // Check if the tab still exists
    chrome.tabs.get(legacyState.appTabId, (existingTab) => {
      if (chrome.runtime.lastError || !existingTab) {
        debugLog('App tab no longer exists, creating new one');
        delete legacyState.appTabId;
        queueAndOpenNew(source);
        return;
      }

      // Tab exists - send source directly and focus it
      if (source) {
        chrome.tabs.sendMessage(legacyState.appTabId!, {
          type: 'capture-source',
          source,
        } as Actions, () => {
          if (chrome.runtime.lastError) {
            // Tab exists but can't receive messages (e.g. still loading)
            // The source will be in pendingSources, it'll get flushed on app-loaded
            debugLog('Failed to send to app tab, queuing source:', chrome.runtime.lastError.message);
            pendingSources.push(source);
          }
        });
      }

      // Focus the existing tab
      chrome.tabs.update(legacyState.appTabId!, { active: true });
      if (existingTab.windowId) {
        chrome.windows.update(existingTab.windowId, { focused: true });
      }
    });
  } else {
    queueAndOpenNew(source);
  }
}

function queueAndOpenNew(source: DataSource | null) {
  if (source) {
    pendingSources.push(source);
  }

  // For PA sources with flow context, pass envId/flowId as URL params for backward compat.
  // This lets the FlowEditor work immediately without waiting for the capture-source message.
  let appUrl = chrome.runtime.getURL("app.html");
  if (source?.serviceType === 'power-automate' && source.context.envId && source.context.flowId) {
    appUrl += `?envId=${encodeURIComponent(source.context.envId)}&flowId=${encodeURIComponent(source.context.flowId)}`;
  }

  chrome.tabs.create({ url: appUrl }, (appTab) => {
    if (chrome.runtime.lastError) {
      debugError('Failed to create app tab:', chrome.runtime.lastError);
      showNotification('Failed to open extension. Please try again.');
      return;
    }
    legacyState.appTabId = appTab.id;
    debugLog('App tab created:', appTab.id);
  });
}

chrome.tabs.onRemoved.addListener((tabId) => {
  if (legacyState.appTabId === tabId) {
    delete legacyState.appTabId;
  }
});

// ─── Multi-service token capture ────────────────────────────────────────────

chrome.webRequest.onBeforeSendHeaders.addListener(
  handleWebRequest,
  { urls: ALL_M365_URL_FILTERS },
  ["requestHeaders"]
);

function handleWebRequest(details: chrome.webRequest.WebRequestHeadersDetails) {
  if (legacyState.appTabId === details.tabId) return;

  const authHeader = details.requestHeaders?.find(
    (x) => x.name.toLowerCase() === "authorization"
  );
  const token = authHeader?.value;
  if (!token) return;

  const { service, context } = detectService(details.url);
  if (service === 'unknown') return;

  const url = new URL(details.url);
  const apiUrl = `${url.protocol}//${url.hostname}/`;
  const existing = tokenStore.getToken(service);

  if (!existing || existing.token !== token) {
    debugLog(`New ${service} token captured from ${url.hostname}`);
    tokenStore.setToken(service, token, apiUrl, context);

    // Broadcast to extension UI
    broadcastToAppTab({
      type: 'service-token-changed',
      service,
      token,
      apiUrl,
      context,
    });

    // Forward to relay if enabled
    sendCredentialToRelay(service, token, apiUrl, context);

    // When a Graph token is captured, propagate to dependent services
    // so their tabs show as "connected" (Graph tokens work for SP/Intune/Forms API calls)
    if (service === 'graph') {
      const graphDependents: ServiceType[] = ['sharepoint', 'intune', 'forms'];
      for (const dep of graphDependents) {
        if (!tokenStore.hasValidToken(dep)) {
          broadcastToAppTab({
            type: 'service-token-changed',
            service: dep,
            token,
            apiUrl,
            context: { ...context, service: dep },
          });
        }
      }
    }

    // Legacy Power Automate compatibility
    if (service === 'power-automate') {
      handleLegacyPowerAutomateRequest(details, token, apiUrl);
    }
  }
}

function handleLegacyPowerAutomateRequest(
  details: chrome.webRequest.WebRequestHeadersDetails,
  token: string,
  apiUrl: string
) {
  legacyState.lastMatchedRequest = extractFlowDataFromUrl(details);

  // Also send legacy token-changed for backward compat with existing FlowEditor
  broadcastToAppTab({
    type: 'token-changed',
    token,
    apiUrl,
  });

  if (legacyState.lastMatchedRequest) {
    legacyState.initiatorTabId = details.tabId;
    chrome.action.enable();
  } else {
    tryExtractFlowDataFromTabUrl(details.tabId);
  }
}

// ─── Message handling ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (action: Actions, sender, sendResponse) => {
    debugLog('Message received:', action.type);

    switch (action.type) {
      case 'app-loaded':
        // Recover appTabId from sender (handles service worker restart losing in-memory state)
        if (sender.tab?.id) {
          legacyState.appTabId = sender.tab.id;
          debugLog('App loaded, recovered appTabId:', legacyState.appTabId);
        }
        sendResponse();
        // Wait for token store to finish loading from storage before sending tokens
        tokenStore.waitForLoad().then(() => {
          debugLog('Token store loaded, sending tokens. Services:', tokenStore.getAllServices());
          // Send legacy token-changed for existing FlowEditor
          sendLegacyTokenChanged();
          // Send all service tokens
          sendAllServiceTokens();
          // Flush any pending data sources
          if (pendingSources.length > 0) {
            debugLog('Flushing', pendingSources.length, 'pending sources');
            for (const source of pendingSources) {
              broadcastToAppTab({ type: 'capture-source', source });
            }
            pendingSources = [];
          }
        });
        break;

      case 'refresh':
        sendResponse();
        refreshInitiator();
        break;

      case 'ai-api-call':
        handleAIApiCall(action, sendResponse);
        return true;

      case 'get-service-data':
        handleGetServiceData(action, sendResponse);
        return true;

      case 'get-service-status':
        sendResponse({
          type: 'service-status-response',
          services: tokenStore.getStatus(),
        });
        break;

      case 'relay-toggle':
        handleRelayToggle(action.enabled, sendResponse);
        return true;

      case 'flow-definition-captured':
        handleFlowDefinitionCaptured(action, sender);
        sendResponse();
        break;

      case 'get-cached-flow':
        handleGetCachedFlow(action, sendResponse);
        break;

      case 'get-all-cached-flows':
        handleGetAllCachedFlows(sendResponse);
        break;

      case 'execute-export':
        handleExecuteExport(action, sendResponse);
        return true;

      case 'export-all-workspace':
        handleExportAllWorkspace(action, sendResponse);
        return true;

      default:
        sendResponse();
        break;
    }
  }
);

function sendLegacyTokenChanged() {
  const paToken = tokenStore.getToken('power-automate');
  if (paToken) {
    debugLog('Sending legacy PA token, apiUrl:', paToken.apiUrl);
    broadcastToAppTab({
      type: 'token-changed',
      token: paToken.token,
      apiUrl: paToken.apiUrl,
    });
  } else {
    debugLog('No PA token available to send');
  }
}

function sendAllServiceTokens() {
  const sentServices = new Set<ServiceType>();

  for (const service of tokenStore.getAllServices()) {
    const stored = tokenStore.getToken(service);
    if (stored) {
      debugLog(`Sending ${service} token, apiUrl:`, stored.apiUrl);
      broadcastToAppTab({
        type: 'service-token-changed',
        service,
        token: stored.token,
        apiUrl: stored.apiUrl,
        context: stored.context,
      });
      sentServices.add(service);
    }
  }

  // Propagate graph token to dependent services that don't have their own token
  const graphToken = tokenStore.getToken('graph');
  if (graphToken) {
    const graphDependents: ServiceType[] = ['sharepoint', 'intune', 'forms'];
    for (const dep of graphDependents) {
      if (!sentServices.has(dep)) {
        broadcastToAppTab({
          type: 'service-token-changed',
          service: dep,
          token: graphToken.token,
          apiUrl: graphToken.apiUrl,
          context: { ...graphToken.context, service: dep },
        });
      }
    }
  }
}

async function handleGetServiceData(
  action: { type: 'get-service-data'; service: ServiceType; endpoint: string },
  sendResponse: (response: any) => void
) {
  try {
    await tokenStore.waitForLoad();

    const url = action.endpoint.startsWith('http')
      ? action.endpoint
      : `https://graph.microsoft.com/v1.0${action.endpoint}`;

    // For Graph API calls, prefer the graph token (correct audience) over service-specific tokens
    const isGraphCall = url.startsWith('https://graph.microsoft.com');
    let stored = tokenStore.getToken(action.service);
    if (isGraphCall && action.service !== 'graph') {
      const graphToken = tokenStore.getToken('graph');
      if (graphToken) {
        stored = graphToken;
      }
    }

    if (!stored) {
      sendResponse({ type: 'service-data-response', data: null, error: 'No valid token for ' + action.service });
      return;
    }

    const headers: Record<string, string> = { Authorization: stored.token };

    // SharePoint REST API needs an explicit Accept header for JSON responses
    if (url.includes('.sharepoint.com') && url.includes('/_api/')) {
      headers['Accept'] = 'application/json;odata=nometadata';
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      sendResponse({ type: 'service-data-response', data: null, error: `HTTP ${response.status}: ${errorText}` });
      return;
    }

    const data = await response.json();
    sendResponse({ type: 'service-data-response', data });
  } catch (error) {
    sendResponse({
      type: 'service-data-response',
      data: null,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ─── Export execution engine ─────────────────────────────────────────────────

function handleExecuteExport(
  request: ExecuteExportAction,
  sendResponse: (response: any) => void
) {
  const { actionId, context } = request;
  const action = getActionById(actionId);
  if (!action) {
    sendResponse({ type: 'export-action-result', actionId, data: null, error: 'Unknown action' });
    return;
  }
  const url = action.endpoint(context);
  const service = action.serviceType as ServiceType;
  const tokenInfo = tokenStore.getToken(service) || tokenStore.getToken('graph' as ServiceType);
  if (!tokenInfo?.token) {
    sendResponse({ type: 'export-action-result', actionId, data: null, error: `No auth token for ${service}` });
    return;
  }
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${tokenInfo.token}`,
    'Accept': 'application/json',
    ...action.headers,
  };
  fetch(url, { headers })
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.statusText}`);
      return r.json();
    })
    .then(raw => {
      const data = action.transform(raw);
      sendResponse({ type: 'export-action-result', actionId, data, error: undefined });
    })
    .catch(err => {
      sendResponse({ type: 'export-action-result', actionId, data: null, error: err.message });
    });
}

async function handleExportAllWorkspace(
  request: ExportAllForWorkspace,
  sendResponse: (response: any) => void
) {
  const results: Array<{ actionId: string; data: any; error?: string }> = [];
  for (const { serviceType, context } of request.sourceContexts) {
    const actions = getActionsForService(serviceType);
    for (const action of actions) {
      if (action.requiresContext?.some(k => !context[k])) continue;
      try {
        const url = action.endpoint(context);
        const tokenInfo = tokenStore.getToken(serviceType as ServiceType) || tokenStore.getToken('graph' as ServiceType);
        if (!tokenInfo?.token) {
          results.push({ actionId: action.id, data: null, error: `No token for ${serviceType}` });
          continue;
        }
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${tokenInfo.token}`,
          'Accept': 'application/json',
          ...action.headers,
        };
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const raw = await r.json();
        results.push({ actionId: action.id, data: action.transform(raw) });
      } catch (err: any) {
        results.push({ actionId: action.id, data: null, error: err.message });
      }
    }
  }
  sendResponse({ type: 'export-all-result', results });
}

// ─── Relay management ───────────────────────────────────────────────────────

async function handleRelayToggle(enabled: boolean, sendResponse: (resp: any) => void) {
  relayEnabled = enabled;
  chrome.storage.local.set({ relayEnabled: enabled });

  if (enabled) {
    await connectRelay();
    // Push all existing credentials to relay
    for (const cred of tokenStore.exportCredentials()) {
      sendCredentialToRelay(cred.service, cred.token, cred.apiUrl, cred.context);
    }
    // Push active workspace data to relay
    await pushWorkspaceToRelay();
  } else {
    disconnectRelay();
  }

  const connected = relayTransport !== 'none';
  sendResponse({
    type: 'relay-status',
    connected,
    transport: relayTransport,
    error: connected ? undefined : 'Could not connect to MCP relay. Ensure the relay server is running on port 8321.',
  });
}

async function connectRelay() {
  // Try native messaging first
  const nativeConnected = await new Promise<boolean>((resolve) => {
    try {
      const port = chrome.runtime.connectNative('com.m365workbench.relay');
      const timeout = setTimeout(() => {
        // If we haven't gotten a disconnect after 500ms, assume it's working
        nativePort = port;
        relayTransport = 'native';
        debugLog('Connected via native messaging');
        resolve(true);
      }, 500);

      port.onDisconnect.addListener(() => {
        clearTimeout(timeout);
        debugLog('Native host disconnected:', chrome.runtime.lastError?.message);
        nativePort = null;
        resolve(false);
      });

      port.onMessage.addListener((msg: any) => {
        debugLog('Native host message:', msg);
      });
    } catch {
      debugLog('Native messaging not available');
      resolve(false);
    }
  });

  if (nativeConnected) return;

  // Fall back to HTTP with retry
  debugLog('Trying HTTP relay...');
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await fetch('http://127.0.0.1:8321/api/health');
      if (resp.ok) {
        relayTransport = 'http';
        debugLog('Connected via HTTP relay');
        return;
      }
    } catch {
      debugLog(`HTTP relay attempt ${attempt + 1} failed`);
      if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
    }
  }

  relayTransport = 'none';
  debugLog('All relay connection methods failed');
}

function disconnectRelay() {
  if (nativePort) {
    nativePort.disconnect();
    nativePort = null;
  }
  relayTransport = 'none';
}

function sendCredentialToRelay(
  service: ServiceType,
  token: string,
  apiUrl: string,
  context: ServiceContext
) {
  if (!relayEnabled) return;

  const payload = { service, token, apiUrl, context };

  if (relayTransport === 'native' && nativePort) {
    nativePort.postMessage({ type: 'credential-update', ...payload });
  } else if (relayTransport === 'http') {
    fetch('http://127.0.0.1:8321/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch((err) => debugError('Failed to send credentials to HTTP relay:', err));
  }
}

async function pushWorkspaceToRelay() {
  if (!relayEnabled || relayTransport === 'none') return;
  try {
    const result = await chrome.storage.local.get('workbench_active_workspace');
    const workspace = result.workbench_active_workspace;
    if (!workspace) return;

    if (relayTransport === 'http') {
      await fetch('http://127.0.0.1:8321/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workspace),
      });
      debugLog('Workspace data pushed to relay');
    }
  } catch (err) {
    debugError('Failed to push workspace to relay:', err);
  }
}

// Re-push workspace data when it changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.workbench_active_workspace && relayEnabled) {
    pushWorkspaceToRelay();
  }
});

// ─── Flow definition capture handlers ────────────────────────────────────────

function handleFlowDefinitionCaptured(
  action: { type: 'flow-definition-captured'; envId: string; flowId: string; flowData: any },
  sender: chrome.runtime.MessageSender
) {
  debugLog('Flow definition captured from content script:', action.flowId);
  cacheFlowDefinition(action.envId, action.flowId, action.flowData);

  // Auto-create a DataSource for this captured flow so it appears in the sidebar
  const source: DataSource = {
    id: crypto.randomUUID(),
    serviceType: 'power-automate',
    context: {
      envId: action.envId,
      flowId: action.flowId,
      captured: 'true',
    },
    label: action.flowData?.properties?.displayName || `Flow ${action.flowId.substring(0, 8)}`,
    sourceUrl: sender.tab?.url || '',
    originTabId: sender.tab?.id,
    capturedAt: Date.now(),
  };

  sendToAppTabOrQueue(source);
}

function handleGetCachedFlow(
  action: { type: 'get-cached-flow'; envId: string; flowId: string },
  sendResponse: (response: any) => void
) {
  const key = `${action.envId}:${action.flowId}`;
  const cached = flowDefinitionCache.get(key);

  if (cached) {
    debugLog('Returning cached flow definition for:', key);
    sendResponse({
      type: 'cached-flow-response',
      flowData: cached.flowData,
      envId: cached.envId,
      flowId: cached.flowId,
    });
  } else {
    debugLog('No cached flow definition for:', key);
    sendResponse({
      type: 'cached-flow-response',
      flowData: null,
    });
  }
}

function handleGetAllCachedFlows(sendResponse: (response: any) => void) {
  const flows = Array.from(flowDefinitionCache.values()).map((entry) => ({
    envId: entry.envId,
    flowId: entry.flowId,
    displayName: entry.displayName,
    capturedAt: entry.capturedAt,
  }));

  sendResponse({
    type: 'all-cached-flows-response',
    flows,
  });
}

// ─── Legacy helpers ─────────────────────────────────────────────────────────

function broadcastToAppTab(action: Actions) {
  if (legacyState.appTabId) {
    chrome.tabs.sendMessage(legacyState.appTabId, action, () => {
      if (chrome.runtime.lastError) {
        debugError('Failed to send message to app tab:', chrome.runtime.lastError);
      }
    });
  }
}

function showNotification(message: string) {
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'icons/pa-tools-48.png',
    title: 'M365 Workbench',
    message,
  });
}

async function handleAIApiCall(action: any, sendResponse: (response: any) => void) {
  try {
    const response = await fetch(action.url, {
      method: action.method,
      headers: action.headers,
      body: action.body,
    });

    if (!response.ok) {
      let errorMessage = `API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.message || errorMessage;
      } catch { /* ignore parse error */ }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    sendResponse({ success: true, data });
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function refreshInitiator() {
  if (legacyState.initiatorTabId) {
    chrome.tabs.reload(legacyState.initiatorTabId, {}, () => {
      if (chrome.runtime.lastError) {
        debugError('Failed to refresh tab:', chrome.runtime.lastError);
      }
    });
  }
}

function tryExtractFlowDataFromTabUrl(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError) return;
    legacyState.lastMatchedRequest = extractFlowDataFromTabUrl(tab.url);
    if (legacyState.lastMatchedRequest) {
      legacyState.initiatorTabId = tabId;
      chrome.action.enable();
    }
  });
}

function extractFlowDataFromTabUrl(url?: string) {
  if (!url) return null;

  const envPatterns = [
    /\/environments\/([a-zA-Z0-9-]*)\//i,
    /environment\/([a-zA-Z0-9-]*)\//i,
    /[?&]environmentId=([a-zA-Z0-9-]*)/i,
    /environments%2F([a-zA-Z0-9-]*)/i,
  ];

  let envResult: RegExpExecArray | null = null;
  for (const pattern of envPatterns) {
    envResult = pattern.exec(url);
    if (envResult) break;
  }
  if (!envResult) return null;

  const flowPatterns = [
    /flows\/(?:shared\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /flow\/(?:shared\/)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /[?&]flowId=([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /flows%2F(?:shared%2F)?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  ];

  let flowResult: RegExpExecArray | null = null;
  for (const pattern of flowPatterns) {
    flowResult = pattern.exec(url);
    if (flowResult) {
      flowResult[1] = decodeURIComponent(flowResult[1]);
      break;
    }
  }
  if (!flowResult) return null;

  return { envId: envResult[1], flowId: flowResult[1] };
}

function extractFlowDataFromUrl(details: chrome.webRequest.WebRequestHeadersDetails) {
  const requestUrl = details.url;
  if (!requestUrl) return null;

  const patterns = [
    /\/providers\/Microsoft\.ProcessSimple\/environments\/(.*)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
    /\/environments\/(.*)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i,
  ];

  for (const pattern of patterns) {
    const result = pattern.exec(requestUrl);
    if (result) {
      return { envId: result[1], flowId: result[2] };
    }
  }
  return null;
}
