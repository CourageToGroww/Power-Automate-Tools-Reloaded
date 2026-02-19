import React, { useState } from 'react';
import { useDataSources } from '../contexts/DataSourceContext';
import { cn } from '../lib/utils';
import {
  Activity,
  Globe,
  HardDrive,
  FileText,
  Network,
  ChevronDown,
  ChevronRight,
  X,
  PanelLeftClose,
} from 'lucide-react';
import type { DataSource, DataSourceGroup } from '../common/types/dataSource';

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  'power-automate': <Activity className="w-4 h-4" />,
  sharepoint: <Globe className="w-4 h-4" />,
  intune: <HardDrive className="w-4 h-4" />,
  forms: <FileText className="w-4 h-4" />,
  graph: <Network className="w-4 h-4" />,
};

function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const SidebarGroup: React.FC<{
  group: DataSourceGroup;
  activeSourceId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}> = ({ group, activeSourceId, onSelect, onRemove }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 shrink-0" />
        )}
        {SERVICE_ICONS[group.serviceType]}
        <span className="truncate">{group.label}</span>
        <span className="ml-auto text-[10px] bg-muted rounded-full px-1.5 py-0.5 shrink-0">
          {group.sources.length}
        </span>
      </button>

      {expanded && (
        <div className="ml-2">
          {group.sources.map((source) => (
            <SourceItem
              key={source.id}
              source={source}
              isActive={source.id === activeSourceId}
              onSelect={() => onSelect(source.id)}
              onRemove={() => onRemove(source.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SourceItem: React.FC<{
  source: DataSource;
  isActive: boolean;
  onSelect: () => void;
  onRemove: () => void;
}> = ({ source, isActive, onSelect, onRemove }) => {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'group flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm rounded-md mx-1 transition-colors',
        isActive
          ? 'bg-primary/10 border-l-2 border-primary text-primary font-medium'
          : 'hover:bg-muted/50 border-l-2 border-transparent'
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate text-xs">{source.label}</div>
        <div className="text-[10px] text-muted-foreground">
          {formatRelativeTime(source.capturedAt)}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-destructive/10 rounded transition-opacity shrink-0"
        title="Remove source"
      >
        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
      </button>
    </div>
  );
};

export const DataSourceSidebar: React.FC = () => {
  const {
    groups,
    activeSourceId,
    setActiveSource,
    removeSource,
    sidebarCollapsed,
    toggleSidebar,
    sources,
  } = useDataSources();

  if (sidebarCollapsed) return null;

  return (
    <>
      {/* Mobile backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-30 md:hidden"
        onClick={toggleSidebar}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-background border-r dark:border-gray-800 flex flex-col shrink-0 z-40 overflow-hidden',
          // Mobile: fixed overlay
          'fixed left-0 top-12 bottom-0 w-60 md:static md:w-56 lg:w-60'
        )}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-800">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Data Sources
          </span>
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-muted rounded transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {sources.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the extension icon on an M365 page to capture a data source.
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <SidebarGroup
                key={group.serviceType}
                group={group}
                activeSourceId={activeSourceId}
                onSelect={setActiveSource}
                onRemove={removeSource}
              />
            ))
          )}
        </div>

        {sources.length > 0 && (
          <div className="px-3 py-2 border-t dark:border-gray-800">
            <div className="text-[10px] text-muted-foreground text-center">
              {sources.length} source{sources.length !== 1 ? 's' : ''} captured
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
