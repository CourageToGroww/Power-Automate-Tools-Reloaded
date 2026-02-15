import { Actions } from './common/types/backgroundActions';
import { ModuleRegistry } from './core/modules/ModuleRegistry';
import { MultiServiceTokenStore } from './core/auth/MultiServiceTokenStore';
import { handleInterceptedRequest } from './core/auth/TokenInterceptor';
import { extractFlowDataFromTabUrl } from './modules/power-automate/urlPatterns';

// Register all modules (auto-registers on import)
import './modules/power-automate';
import './modules/graph';

const DEBUG = true;

function debugLog(...args: unknown[]) {
  if (DEBUG) {
    console.log('[M365-Workbench Background]', ...args);
  }
}

function debugError(...args: unknown[]) {
  if (DEBUG) {
    console.error('[M365-Workbench Background Error]', ...args);
  }
}

// App state
let appTabId: number | undefined;
let initiatorTabId: number | undefined;

chrome.action.enable();
debugLog('Extension initialized, action enabled');

// --- Extension icon click handler ---

chrome.action.onClicked.addListener((tab) => {
  const authenticatedServices = MultiServiceTokenStore.getAuthenticatedServices();
  debugLog('Extension clicked, authenticated services:', authenticatedServices);

  // For PA flows: try to extract flow data from current tab URL if not already known
  const paCreds = MultiServiceTokenStore.get('power-automate');
  if (!paCreds && tab.url) {
    const flowData = extractFlowDataFromTabUrl(tab.url);
    if (flowData) {
      debugLog('Flow data extracted from tab URL:', flowData);
      // We have flow data but no token yet
    }
  }

  // Check if we have any authenticated service
  if (authenticatedServices.length === 0) {
    // Legacy PA behavior: try to extract flow data and guide user
    if (tab.url) {
      const flowData = extractFlowDataFromTabUrl(tab.url);
      if (!flowData) {
        showNotification(
          'Please navigate to a Microsoft 365 service page first (Power Automate, SharePoint, etc.).'
        );
        return;
      }
    }
    showNotification(
      'No authentication detected. Please refresh the page and interact with the service, then try again.'
    );
    return;
  }

  // Build app URL
  let appUrl = chrome.runtime.getURL('app.html');

  // If PA is authenticated and has flow context, pass it as query params (backward compat)
  if (paCreds && paCreds.context.envId && paCreds.context.flowId) {
    appUrl += `?envId=${paCreds.context.envId}&flowId=${paCreds.context.flowId}`;
  }

  debugLog('Creating app tab with URL:', appUrl);
  chrome.tabs.create({ url: appUrl }, (newTab) => {
    if (chrome.runtime.lastError) {
      debugError('Failed to create app tab:', chrome.runtime.lastError);
      showNotification('Failed to open extension. Please try again.');
      return;
    }
    appTabId = newTab.id;
    initiatorTabId = tab.id;
    debugLog('App tab created with ID:', newTab.id);
  });
});

// --- Tab lifecycle ---

chrome.tabs.onRemoved.addListener((tabId) => {
  if (appTabId === tabId) {
    debugLog('App tab closed:', tabId);
    appTabId = undefined;
  }
});

// --- webRequest interception ---

// Collect all URL patterns from registered modules
const allUrlPatterns = ModuleRegistry.getAllUrlPatternStrings();
debugLog('Registering webRequest listener for patterns:', allUrlPatterns);

if (allUrlPatterns.length > 0) {
  chrome.webRequest.onBeforeSendHeaders.addListener(
    onBeforeSendHeaders,
    { urls: allUrlPatterns },
    ['requestHeaders']
  );
}

function onBeforeSendHeaders(
  details: chrome.webRequest.WebRequestHeadersDetails
) {
  // Skip requests from our own app tab
  if (appTabId === details.tabId) return;

  const result = handleInterceptedRequest(details);
  if (!result) return;

  if (result.isNew) {
    debugLog(`New credentials for ${result.serviceId}:`, result.context.ids);
    initiatorTabId = details.tabId;
    chrome.action.enable();

    // Send token to app tab (both old and new format)
    sendTokenChanged(result.serviceId);
    sendToRelay(result.serviceId);
  }

  // If no flow data was matched from the API URL, try tab URL
  if (result.serviceId === 'power-automate' && !result.context.ids.flowId) {
    tryExtractFlowDataFromTab(details.tabId);
  }
}

/**
 * Fallback: try extracting flow data from the tab's visible URL.
 */
function tryExtractFlowDataFromTab(tabId: number) {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab.url) return;

    const flowData = extractFlowDataFromTabUrl(tab.url);
    if (!flowData) return;

    debugLog('Flow data from tab URL:', flowData);
    const existing = MultiServiceTokenStore.get('power-automate');
    if (existing) {
      MultiServiceTokenStore.store('power-automate', {
        ...existing,
        context: { ...existing.context, ...flowData },
      });
      initiatorTabId = tabId;
      chrome.action.enable();
    }
  });
}

// --- Messaging ---

chrome.runtime.onMessage.addListener(
  (action: Actions, sender, sendResponse) => {
    debugLog('Received message:', action.type, 'from tab:', sender.tab?.id);

    // Handle relay messages from any tab
    if (action.type === 'get-relay-state') {
      sendResponse({ enabled: relayEnabled, status: relayStatus });
      return;
    }
    if (action.type === 'toggle-relay') {
      const next = action.enabled;
      relayEnabled = next;
      chrome.storage.local.set({ relayEnabled: next });
      if (next) {
        checkRelayHealth().then(() => {
          // Forward all authenticated services
          for (const svcId of MultiServiceTokenStore.getAuthenticatedServices()) {
            sendToRelay(svcId);
          }
          sendResponse({ enabled: relayEnabled, status: relayStatus });
        });
        return true;
      } else {
        relayStatus = 'off';
        sendResponse({ enabled: relayEnabled, status: relayStatus });
        return;
      }
    }

    if (sender.tab?.id === appTabId) {
      switch (action.type) {
        default:
          sendResponse();
          break;
        case 'app-loaded':
          debugLog('App loaded, sending all service tokens');
          sendResponse();
          // Send tokens for all authenticated services
          for (const svcId of MultiServiceTokenStore.getAuthenticatedServices()) {
            sendTokenChanged(svcId);
          }
          break;
        case 'refresh':
          debugLog('Refresh requested');
          sendResponse();
          refreshInitiator();
          break;
        case 'ai-api-call':
          debugLog('AI API call requested');
          handleAIApiCall(action, sendResponse);
          return true;
      }
    } else {
      debugLog('Message from non-app tab, ignoring');
      sendResponse();
    }
  }
);

// --- Token messaging to app tab ---

function sendTokenChanged(serviceId: string) {
  const creds = MultiServiceTokenStore.get(serviceId);
  if (!creds) return;

  if (MultiServiceTokenStore.isExpired(serviceId)) {
    debugError(`Token expired for ${serviceId}, not sending`);
    return;
  }

  // New format: service-token-changed
  sendMessageToTab({
    type: 'service-token-changed',
    serviceId,
    credentials: {
      token: creds.token,
      apiUrl: creds.apiUrl,
      context: creds.context,
    },
  });

  // Legacy format: token-changed (for backward compat with existing PA pages)
  if (serviceId === 'power-automate') {
    sendMessageToTab({
      type: 'token-changed',
      token: creds.token,
      apiUrl: creds.apiUrl,
    });
  }
}

function sendMessageToTab(action: Actions) {
  if (!appTabId) return;
  chrome.tabs.sendMessage(appTabId, action, () => {
    if (chrome.runtime.lastError) {
      // Tab may not be listening yet
    }
  });
}

// --- MCP Relay ---

let relayEnabled = false;
let relayStatus: 'off' | 'connected' | 'unreachable' | 'error' = 'off';
const RELAY_URL = 'http://127.0.0.1:8321';

chrome.storage.local.get('relayEnabled', (result) => {
  relayEnabled = result.relayEnabled === true;
  debugLog('Relay forwarding:', relayEnabled ? 'enabled' : 'disabled');
  if (relayEnabled) {
    checkRelayHealth();
  }
});

function checkRelayHealth(): Promise<void> {
  debugLog('Checking relay health at', RELAY_URL);
  return fetch(`${RELAY_URL}/api/status`)
    .then((res) => {
      if (res.ok) {
        relayStatus = 'connected';
        debugLog('Relay is reachable');
      } else {
        relayStatus = 'error';
        debugLog('Relay returned error:', res.status);
      }
      notifyRelayState();
    })
    .catch((err) => {
      relayStatus = 'unreachable';
      debugError('Relay not reachable:', err?.message || err);
      showNotification(
        'MCP relay is not running. Start it with: cd mcp-server && ./relay.sh start'
      );
      notifyRelayState();
    });
}

function notifyRelayState() {
  if (appTabId) {
    chrome.tabs.sendMessage(
      appTabId,
      { type: 'relay-state-changed', enabled: relayEnabled, status: relayStatus },
      () => { if (chrome.runtime.lastError) { /* tab may not be listening */ } }
    );
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.relayEnabled) {
    relayEnabled = changes.relayEnabled.newValue === true;
    debugLog('Relay toggled:', relayEnabled ? 'enabled' : 'disabled');
    if (relayEnabled) {
      checkRelayHealth();
      for (const svcId of MultiServiceTokenStore.getAuthenticatedServices()) {
        sendToRelay(svcId);
      }
    } else {
      relayStatus = 'off';
      notifyRelayState();
    }
  }
});

function sendToRelay(serviceId: string) {
  if (!relayEnabled) return;
  const creds = MultiServiceTokenStore.get(serviceId);
  if (!creds) return;

  if (MultiServiceTokenStore.isExpired(serviceId)) {
    debugLog(`Token expired for ${serviceId}, not sending to relay`);
    return;
  }

  const payload: Record<string, unknown> = {
    serviceId,
    token: creds.token,
    apiUrl: creds.apiUrl,
    ...creds.context,
  };

  fetch(`${RELAY_URL}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (res.ok) {
        debugLog(`Credentials forwarded to relay for ${serviceId}`);
      } else {
        debugError('Relay responded with:', res.status);
      }
    })
    .catch((err) => {
      debugLog('Relay not reachable:', err.message);
    });
}

// --- Utilities ---

function refreshInitiator() {
  if (initiatorTabId) {
    chrome.tabs.reload(initiatorTabId, {}, () => {
      if (chrome.runtime.lastError) {
        debugError('Failed to refresh tab:', chrome.runtime.lastError);
      }
    });
  }
}

function showNotification(message: string) {
  if (!chrome.notifications) {
    debugLog('chrome.notifications not available:', message);
    return;
  }
  chrome.notifications.create('m365-workbench-' + Date.now(), {
    type: 'basic',
    iconUrl: 'icons/pa-tools-48.png',
    title: 'M365 Workbench',
    message,
  }, () => {
    if (chrome.runtime.lastError) {
      debugError('Notification failed:', chrome.runtime.lastError.message);
    }
  });
}

async function handleAIApiCall(action: Actions & { type: 'ai-api-call' }, sendResponse: (response: unknown) => void) {
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
        errorMessage = (errorData as Record<string, unknown>)?.error
          ? String(((errorData as Record<string, unknown>).error as Record<string, unknown>)?.message)
          : errorMessage;
      } catch {
        // ignore parse errors
      }
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
