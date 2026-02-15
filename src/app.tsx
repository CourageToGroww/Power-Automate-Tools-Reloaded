import { initializeIcons } from '@fluentui/react/lib/Icons';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import './styles/globals.css';

// Core module system
import { DynamicNavBar } from './core/nav/DynamicNavBar';
import { DynamicRouter } from './core/routing/DynamicRouter';
import {
  MultiServiceApiProvider,
  useApiProviderContext,
} from './core/providers/MultiServiceApiProvider';

// Register modules (auto-registers on import)
import './modules/power-automate';
import { registerPARoutes } from './modules/power-automate/routes';

// Register frontend routes for each module
registerPARoutes();

initMonaco();
initializeIcons();

mergeStyles({
  ':global(body,html,#app)': {
    margin: 0,
    padding: 0,
    height: '100vh',
  },
});

createRoot(document.getElementById('app')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

function App() {
  return (
    <HashRouter>
      <MultiServiceApiProvider>
        <AppContent />
      </MultiServiceApiProvider>
    </HashRouter>
  );
}

function AppContent() {
  const apiProvider = useApiProviderContext();
  const [isWaitingForAuth, setIsWaitingForAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Get URL parameters (backward compat for PA flow context)
  const urlParams = new URLSearchParams(window.location.search);
  const envId = urlParams.get('envId');
  const flowId = urlParams.get('flowId');

  useEffect(() => {
    // For PA module: validate URL params
    if (envId || flowId) {
      if (!envId || !flowId) {
        setAuthError(
          'Invalid URL parameters. Please open the extension from a Power Automate flow page.'
        );
        setIsWaitingForAuth(false);
        return;
      }
    }

    // Wait for API to be ready or timeout
    const timeout = setTimeout(() => {
      if (!apiProvider.isApiReady) {
        setAuthError(
          'Authentication timeout. Please refresh the service page and try again.'
        );
        setIsWaitingForAuth(false);
      }
    }, 30000);

    if (apiProvider.isApiReady) {
      setIsWaitingForAuth(false);
      setAuthError(null);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [apiProvider.isApiReady, envId, flowId]);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Stack styles={{ root: { height: '100%' } }}>
      <DynamicNavBar />

      {authError && (
        <MessageBar
          messageBarType={MessageBarType.error}
          isMultiline={false}
          onDismiss={() => setAuthError(null)}
          actions={
            <div>
              <button onClick={handleRefresh}>Refresh</button>
            </div>
          }
        >
          {authError}
        </MessageBar>
      )}

      {isWaitingForAuth && !authError ? (
        <Stack
          horizontalAlign="center"
          verticalAlign="center"
          styles={{ root: { flex: 1, padding: 20 } }}
        >
          <Spinner size={SpinnerSize.large} />
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <h3>Connecting to Microsoft 365 services...</h3>
            <p>Please make sure you have an active session in the browser.</p>
            <p>If this takes too long, try refreshing the service page first.</p>
          </div>
        </Stack>
      ) : apiProvider.isApiReady && !authError ? (
        <DynamicRouter />
      ) : !authError ? (
        <Stack
          horizontalAlign="center"
          verticalAlign="center"
          styles={{ root: { flex: 1, padding: 20 } }}
        >
          <h2>Please interact with a Microsoft 365 service first.</h2>
          <p>To use this extension:</p>
          <ol>
            <li>Go to a supported Microsoft 365 service (Power Automate, SharePoint, etc.)</li>
            <li>Interact with the page to trigger API requests</li>
            <li>Click the extension icon again</li>
          </ol>
        </Stack>
      ) : null}
    </Stack>
  );
}

function initMonaco() {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    enableSchemaRequest: true,
    schemas: [
      {
        uri: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json',
        schema: require('./schemas/workflowdefinition'),
      },
      {
        uri: 'https://power-automate-tools.local/flow-editor.json',
        schema: require('./schemas/flow-editor'),
        fileMatch: ['*'],
      },
    ],
  });

  loader.config({
    monaco: monaco,
  });
}
