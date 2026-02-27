import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataSource, DataSourceGroup, getSourceDeduplicationKey } from '../common/types/dataSource';
import type { Actions } from '../common/types/backgroundActions';

const SERVICE_ROUTES: Record<string, string> = {
  'power-automate': '/',
  sharepoint: '/sharepoint',
  intune: '/intune',
  forms: '/forms',
  graph: '/graph',
};

const SERVICE_LABELS: Record<string, string> = {
  'power-automate': 'Power Automate',
  sharepoint: 'SharePoint',
  intune: 'Intune',
  forms: 'Forms',
  graph: 'Graph Explorer',
};

interface DataSourceContextValue {
  sources: DataSource[];
  groups: DataSourceGroup[];
  activeSource: DataSource | null;
  activeSourceId: string | null;
  addSource: (source: DataSource) => void;
  setActiveSource: (id: string) => void;
  removeSource: (id: string) => void;
  clearSources: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const DataSourceContext = createContext<DataSourceContextValue>({} as DataSourceContextValue);

export const DataSourceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sources, setSources] = useState<DataSource[]>([]);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  const addSource = useCallback(
    (source: DataSource) => {
      let targetId = source.id;

      setSources((prev) => {
        const newKey = getSourceDeduplicationKey(source);
        const existingIdx = prev.findIndex(
          (s) => getSourceDeduplicationKey(s) === newKey
        );

        if (existingIdx >= 0) {
          // Update existing source (refresh timestamp, label, etc.)
          targetId = prev[existingIdx].id;
          const updated = [...prev];
          updated[existingIdx] = {
            ...prev[existingIdx],
            label: source.label,
            sourceUrl: source.sourceUrl,
            originTabId: source.originTabId,
            capturedAt: source.capturedAt,
          };
          return updated;
        }

        return [...prev, source];
      });

      // Always activate the newly captured source
      setActiveSourceId(targetId);
    },
    []
  );

  const removeSource = useCallback(
    (id: string) => {
      setSources((prev) => prev.filter((s) => s.id !== id));
      setActiveSourceId((prevId) => (prevId === id ? null : prevId));
    },
    []
  );

  const clearSources = useCallback(() => {
    setSources([]);
    setActiveSourceId(null);
  }, []);

  const setActiveSource = useCallback(
    (id: string) => {
      setActiveSourceId(id);
    },
    []
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Listen for capture-source messages from background
  useEffect(() => {
    const handler = (action: Actions) => {
      if (action.type === 'capture-source') {
        addSource(action.source);
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [addSource]);

  // Derive active source
  const activeSource = useMemo(() => {
    if (!activeSourceId) return null;
    return sources.find((s) => s.id === activeSourceId) ?? null;
  }, [sources, activeSourceId]);

  // Navigate when active source changes (only on actual source switch, not re-renders).
  // Track previous activeSourceId to avoid re-navigating on every render,
  // which would override explicit user navigation (e.g., clicking "Previous Runs").
  const prevActiveSourceIdRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!activeSource) return;
    if (activeSource.id === prevActiveSourceIdRef.current) return;
    prevActiveSourceIdRef.current = activeSource.id;
    const route = SERVICE_ROUTES[activeSource.serviceType];
    if (route) {
      navigate(route);
    }
  }, [activeSource, navigate]);

  // Build grouped sources
  const groups = useMemo((): DataSourceGroup[] => {
    const groupMap = new Map<string, DataSource[]>();
    for (const source of sources) {
      const existing = groupMap.get(source.serviceType) ?? [];
      existing.push(source);
      groupMap.set(source.serviceType, existing);
    }

    return Array.from(groupMap.entries())
      .map(([serviceType, groupSources]) => ({
        serviceType,
        label: SERVICE_LABELS[serviceType] ?? serviceType,
        icon: serviceType,
        sources: groupSources.sort((a, b) => b.capturedAt - a.capturedAt),
      }));
  }, [sources]);

  const value = useMemo<DataSourceContextValue>(
    () => ({
      sources,
      groups,
      activeSource,
      activeSourceId,
      addSource,
      setActiveSource,
      removeSource,
      clearSources,
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
    }),
    [
      sources,
      groups,
      activeSource,
      activeSourceId,
      addSource,
      setActiveSource,
      removeSource,
      clearSources,
      sidebarCollapsed,
      toggleSidebar,
      setSidebarCollapsed,
    ]
  );

  return (
    <DataSourceContext.Provider value={value}>
      {children}
    </DataSourceContext.Provider>
  );
};

export function useDataSources(): DataSourceContextValue {
  return useContext(DataSourceContext);
}
