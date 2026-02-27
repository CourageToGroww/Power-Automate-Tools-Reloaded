// Content script running in MAIN world (same JS context as the page).
// Intercepts fetch/XHR responses to capture flow definitions as they load.

(function () {
  const FLOW_DEF_PATTERN =
    /\/providers\/Microsoft\.ProcessSimple\/environments\/([^/?]+)\/flows\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

  function postCapture(envId: string, flowId: string, flowData: unknown) {
    window.postMessage(
      {
        type: 'M365_WORKBENCH_FLOW_CAPTURED',
        envId,
        flowId,
        flowData,
      },
      '*'
    );
  }

  // --- Intercept fetch ---
  const originalFetch = window.fetch;

  window.fetch = async function (
    ...args: Parameters<typeof fetch>
  ): Promise<Response> {
    const response = await originalFetch.apply(this, args);

    try {
      const request = args[0];
      const url =
        typeof request === 'string'
          ? request
          : request instanceof Request
            ? request.url
            : '';

      const match = FLOW_DEF_PATTERN.exec(url);
      if (match && response.ok) {
        const cloned = response.clone();
        cloned
          .json()
          .then((data: any) => {
            if (data?.properties?.definition) {
              postCapture(match[1], match[2], data);
            }
          })
          .catch(() => {
            // Not JSON - ignore
          });
      }
    } catch {
      // Never break the page
    }

    return response;
  };

  // --- Intercept XMLHttpRequest ---
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: any[]
  ) {
    (this as any).__m365wb_url = typeof url === 'string' ? url : url.toString();
    return originalOpen.apply(this, [method, url, ...rest] as any);
  };

  XMLHttpRequest.prototype.send = function (...args: any[]) {
    const url: string = (this as any).__m365wb_url || '';
    const match = FLOW_DEF_PATTERN.exec(url);

    if (match) {
      const envId = match[1];
      const flowId = match[2];

      this.addEventListener('load', function () {
        if (this.status >= 200 && this.status < 300) {
          try {
            const data = JSON.parse(this.responseText);
            if (data?.properties?.definition) {
              postCapture(envId, flowId, data);
            }
          } catch {
            // ignore
          }
        }
      });
    }

    return originalSend.apply(this, args as any);
  };
})();
