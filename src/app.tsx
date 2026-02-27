import { initializeIcons } from '@fluentui/react/lib/Icons';
import { Stack } from '@fluentui/react/lib/Stack';
import { mergeStyles } from '@fluentui/react/lib/Styling';
import { MessageBar, MessageBarType } from '@fluentui/react/lib/MessageBar';
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { createRoot } from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { NavBar } from './common/components/NavBarNew';
import {
  ApiProviderContext,
  ApiProviderContextRoot
} from './common/providers/ApiProvider';
import { MultiServiceApiProvider, useMultiServiceApi } from './common/providers/MultiServiceApiProvider';
import { DataSourceProvider, useDataSources } from './contexts/DataSourceContext';
import { DataSourceSidebar } from './components/DataSourceSidebar';
import { FlowEditorPage } from './features/flow-editor/FlowEditorPage';
import { PreviousRunsPage } from './features/previous-runs/PreviousRunsPage';
import { SharePointPage } from './features/sharepoint/SharePointPage';
import { IntunePage } from './features/intune/IntunePage';
import { FormsPage } from './features/forms/FormsPage';
import { GraphPage } from './features/graph/GraphPage';
import { useEffect, useState } from 'react';
import { WorkspaceProvider } from './common/providers/WorkspaceContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DataSource } from './common/types/dataSource';
import './styles/globals.css';

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
  const apiProviderRoot = ApiProviderContextRoot();

  return (
    <HashRouter>
      <MultiServiceApiProvider>
        <ApiProviderContext.Provider value={apiProviderRoot}>
          <WorkspaceProvider>
            <DataSourceProvider>
              <AppContent legacyApi={apiProviderRoot} />
            </DataSourceProvider>
          </WorkspaceProvider>
        </ApiProviderContext.Provider>
      </MultiServiceApiProvider>
    </HashRouter>
  );
}

function AppContent({ legacyApi }: { legacyApi: { isApiReady: boolean } }) {
  const multiServiceApi = useMultiServiceApi();
  const { sources } = useDataSources();
  const [authError, setAuthError] = useState<string | null>(null);

  // Any service ready (not just PA)
  const isAnyReady = legacyApi.isApiReady || multiServiceApi.activeServices.length > 0;

  const hasSources = sources.length > 0;

  // Check if URL has PA params (legacy mode - always skip auth gate)
  const urlParams = new URLSearchParams(window.location.search);
  const hasUrlParams = Boolean(urlParams.get('envId') && urlParams.get('flowId'));

  // Skip the global auth gate if we have data sources OR legacy URL params.
  // Each feature page handles its own loading/auth state.
  const skipAuthGate = hasSources || hasUrlParams;

  // Backward compat: if URL has envId+flowId params, auto-create a DataSource
  useBackwardCompatSource();

  // Only show auth error if we have NO other way to display content
  useEffect(() => {
    if (skipAuthGate || isAnyReady) return;

    const timeout = setTimeout(() => {
      if (!isAnyReady) {
        setAuthError(
          'Authentication timeout. Please refresh the service page and try again.'
        );
      }
    }, 30000);

    if (isAnyReady) {
      setAuthError(null);
      clearTimeout(timeout);
    }

    return () => clearTimeout(timeout);
  }, [isAnyReady, skipAuthGate]);

  const handleRefresh = () => {
    window.location.reload();
  };

  // Show main layout when: we have sources, url params, or auth is ready
  const showMainLayout = skipAuthGate || isAnyReady;

  return (
    <div className="h-full flex flex-col">
      <NavBar />

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

      {showMainLayout ? (
        <div className="flex-1 flex overflow-hidden">
          <DataSourceSidebar />
          <main className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <Routes>
                <Route path="/">
                  <Route index element={<FlowEditorPage />} />
                  <Route path="failures" element={<div className="flex-1 overflow-auto"><PreviousRunsPage /></div>} />
                  <Route path="sharepoint" element={<div className="flex-1 overflow-auto"><SharePointPage /></div>} />
                  <Route path="intune" element={<div className="flex-1 overflow-auto"><IntunePage /></div>} />
                  <Route path="forms" element={<div className="flex-1 overflow-auto"><FormsPage /></div>} />
                  <Route path="graph" element={<div className="flex-1 overflow-auto"><GraphPage /></div>} />
                </Route>
              </Routes>
            </div>
          </main>
        </div>
      ) : !authError ? (
        <Stack
          horizontalAlign="center"
          verticalAlign="center"
          styles={{ root: { flex: 1, padding: 20 } }}
        >
          <h2>Please refresh the M365 service page first.</h2>
          <p>To use the M365 Workbench:</p>
          <ol>
            <li>Go to a Microsoft 365 service (SharePoint, Power Automate, Intune, Forms)</li>
            <li>Make sure you are signed in</li>
            <li>Click the extension icon</li>
          </ol>
        </Stack>
      ) : null}
    </div>
  );
}

/**
 * Backward compat: if URL has envId+flowId params (old PA mode),
 * auto-create a DataSource so the sidebar + context-based navigation work.
 */
function useBackwardCompatSource() {
  const { addSource, sources } = useDataSources();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const envId = urlParams.get('envId');
    const flowId = urlParams.get('flowId');

    if (!envId || !flowId) return;
    // Only create once
    if (sources.some((s) => s.serviceType === 'power-automate' && s.context.flowId === flowId)) return;

    const source: DataSource = {
      id: crypto.randomUUID(),
      serviceType: 'power-automate',
      context: { envId, flowId },
      label: `Flow ${flowId.substring(0, 8)}`,
      sourceUrl: window.location.href,
      capturedAt: Date.now(),
    };

    addSource(source);
  }, []); // Run once on mount
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
        fileMatch: ['*']
      },
    ],
  });

  loader.config({
    monaco: monaco,
  });
}
