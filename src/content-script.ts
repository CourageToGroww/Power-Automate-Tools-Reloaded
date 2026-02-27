// Content script running in ISOLATED world.
// Bridges messages between the MAIN-world interceptor and the background service worker.

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type !== 'M365_WORKBENCH_FLOW_CAPTURED') return;

  chrome.runtime.sendMessage(
    {
      type: 'flow-definition-captured',
      envId: event.data.envId,
      flowId: event.data.flowId,
      flowData: event.data.flowData,
    },
    () => {
      // Suppress "receiving end does not exist" error when extension is not listening
      if (chrome.runtime.lastError) {
        // intentionally ignored
      }
    }
  );
});
