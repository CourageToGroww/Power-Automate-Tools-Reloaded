import React, { useState, useEffect, useMemo } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';
import { useSites, useLists, fetchFullListJson } from './useSharePoint';
import { useDataSources } from '../../contexts/DataSourceContext';
import { ExportActions } from '../../common/components/ExportActions';
import { ServiceEditor } from '../../common/components/ServiceEditor';
import { SHAREPOINT_TABS } from './sharepointEditorConfig';
import type { ServiceContext } from '../../common/types/serviceEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../lib/utils';
import {
  Globe,
  List,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Unplug,
  ArrowLeft,
  Copy,
  ClipboardCheck,
  Loader2,
} from 'lucide-react';

function formatDate(dateString: string | undefined): string {
  if (!dateString) return '--';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

const NotConnected: React.FC = () => (
  <div className="h-full flex items-center justify-center p-6">
    <Card className="max-w-md w-full">
      <CardContent className="flex flex-col items-center text-center py-12 px-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Unplug className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">SharePoint Not Connected</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect to SharePoint by visiting a SharePoint site in your browser.
          The extension will capture your authentication automatically.
        </p>
      </CardContent>
    </Card>
  </div>
);

const ErrorMessage: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <Card className="border-destructive/50">
    <CardContent className="flex items-center gap-3 py-4">
      <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
      <p className="text-sm text-destructive flex-1">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </CardContent>
  </Card>
);

const LoadingSpinner: React.FC<{ label?: string }> = ({ label }) => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-muted-foreground" />
      {label && <p className="text-sm text-muted-foreground">{label}</p>}
    </div>
  </div>
);

/** Build a SharePoint REST API base URL from an active data source */
function deriveSiteUrl(activeSource: ReturnType<typeof useDataSources>['activeSource']): string | undefined {
  if (!activeSource || activeSource.serviceType !== 'sharepoint') return undefined;
  try {
    const url = new URL(activeSource.sourceUrl);
    const siteMatch = /\/sites\/([^/?#]+)/i.exec(url.pathname);
    if (!siteMatch) return undefined;
    return `https://${url.hostname}/sites/${siteMatch[1]}`;
  } catch {
    return undefined;
  }
}

export const SharePointPage: React.FC = () => {
  const client = useServiceApi('sharepoint');
  const { sites, isLoading: isLoadingSites, error: sitesError, refetch: refetchSites, isReady, spContext } = useSites();
  const { activeSource } = useDataSources();
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedListName, setSelectedListName] = useState<string>('');
  const [autoSelected, setAutoSelected] = useState(false);
  const [quickJsonLoading, setQuickJsonLoading] = useState<string | null>(null);
  const [quickJsonCopied, setQuickJsonCopied] = useState<string | null>(null);

  const { lists, isLoading: isLoadingLists, error: listsError, refetch: refetchLists } = useLists(selectedSiteId);

  const handleQuickJson = async (e: React.MouseEvent, listId: string, listName: string) => {
    e.stopPropagation(); // Don't navigate to detail panel
    setQuickJsonLoading(listId);
    setQuickJsonCopied(null);
    try {
      const spCtxLocal = spContext ? { baseUrl: spContext.baseUrl } : null;
      const result = await fetchFullListJson(client, spCtxLocal, selectedSiteId!, listId, listName);
      const json = JSON.stringify(result, null, 2);
      await navigator.clipboard.writeText(json);
      setQuickJsonCopied(listId);
      setTimeout(() => setQuickJsonCopied(null), 3000);
    } catch (err) {
      console.error('Failed to get list JSON:', err);
    } finally {
      setQuickJsonLoading(null);
    }
  };

  // Auto-select site when loaded from DataSource context
  useEffect(() => {
    if (autoSelected || sites.length === 0) return;
    if (spContext && sites.length === 1) {
      setSelectedSiteId(sites[0].id);
      setAutoSelected(true);
    }
  }, [sites, spContext, autoSelected]);

  // Auto-select list when loaded from DataSource context
  useEffect(() => {
    if (!spContext?.listSlug || lists.length === 0 || selectedListId) return;
    // Try to match the list by title (URL slug often matches the list title)
    const listSlug = decodeURIComponent(spContext.listSlug);
    const matched = lists.find(
      (l) => l.displayName.toLowerCase().replace(/\s+/g, '') === listSlug.toLowerCase().replace(/\s+/g, '')
        || l.displayName.toLowerCase() === listSlug.toLowerCase()
    );
    if (matched) {
      setSelectedListId(matched.id);
      setSelectedListName(matched.displayName);
    }
  }, [lists, spContext?.listSlug, selectedListId]);

  if (!client.isReady && !isReady) {
    return <NotConnected />;
  }

  // Build ServiceContext for the editor when a list is selected
  const siteUrl = spContext?.baseUrl || deriveSiteUrl(activeSource);
  const editorContext = useMemo<ServiceContext>(() => ({
    client,
    siteUrl: siteUrl || '',
    listId: selectedListId || '',
    listName: selectedListName,
  }), [client, siteUrl, selectedListId, selectedListName]);

  // If a list is selected, show the Service Editor
  if (selectedSiteId && selectedListId) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedListId(null); setSelectedListName(''); }}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">
              {selectedListName}
            </h1>
            <p className="text-xs text-muted-foreground">
              {sites.find(s => s.id === selectedSiteId)?.displayName || 'Site'} &middot; SharePoint Editor
            </p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ServiceEditor
            tabs={SHAREPOINT_TABS}
            context={editorContext}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Page Header */}
      <div className="p-4 md:p-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">SharePoint</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse sites, lists, and list items
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetchSites}
            disabled={isLoadingSites}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoadingSites && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-6">
          {/* Export Actions */}
          <ExportActions
            serviceType="sharepoint"
            context={{
              siteUrl: spContext?.baseUrl || activeSource?.context?.siteUrl || '',
              listTitle: activeSource?.context?.listTitle || '',
            }}
          />

          {/* Sites error */}
          {sitesError && <ErrorMessage message={sitesError} onRetry={refetchSites} />}

          {/* Sites loading */}
          {isLoadingSites && <LoadingSpinner label="Loading sites..." />}

          {/* Sites list */}
          {!isLoadingSites && sites.length === 0 && !sitesError && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Globe className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No accessible sites found.</p>
              </CardContent>
            </Card>
          )}

          {!isLoadingSites && sites.length > 0 && (
            <div className="space-y-4">
              {/* Site selector */}
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {sites.map((site) => (
                  <Card
                    key={site.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-md',
                      selectedSiteId === site.id
                        ? 'border-primary ring-1 ring-primary'
                        : 'hover:border-primary/50'
                    )}
                    onClick={() => {
                      setSelectedSiteId(site.id);
                      setSelectedListId(null);
                      setSelectedListName('');
                    }}
                  >
                    <CardHeader className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                          <Globe className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">{site.displayName}</CardTitle>
                          {site.description && (
                            <CardDescription className="text-xs mt-1 line-clamp-2">
                              {site.description}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>

              {/* Lists for selected site */}
              {selectedSiteId && (
                <Card>
                  <CardHeader className="py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <List className="w-4 h-4 text-muted-foreground" />
                        <CardTitle className="text-sm">
                          Lists in {sites.find(s => s.id === selectedSiteId)?.displayName}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={refetchLists}
                        disabled={isLoadingLists}
                      >
                        <RefreshCw className={cn('w-3.5 h-3.5', isLoadingLists && 'animate-spin')} />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 px-4 pb-4">
                    {listsError && <ErrorMessage message={listsError} onRetry={refetchLists} />}
                    {isLoadingLists ? (
                      <LoadingSpinner label="Loading lists..." />
                    ) : lists.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No lists found in this site.
                      </p>
                    ) : (
                      <div className="overflow-x-auto -mx-4 px-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Title</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Item Count</th>
                              <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">Last Modified</th>
                              <th className="text-right py-2 pr-4 font-medium text-muted-foreground">JSON</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {lists.map((list) => (
                              <tr
                                key={list.id}
                                className="border-b last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                                onClick={() => {
                                  setSelectedListId(list.id);
                                  setSelectedListName(list.displayName);
                                }}
                              >
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <List className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                    <span className="truncate">{list.displayName}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4 hidden sm:table-cell">
                                  <Badge variant="secondary" className="text-xs">
                                    {list.itemCount}
                                  </Badge>
                                </td>
                                <td className="py-2.5 pr-4 text-muted-foreground text-xs hidden md:table-cell">
                                  {formatDate(list.lastModifiedDateTime)}
                                </td>
                                <td className="py-2.5 pr-4 text-right">
                                  <Button
                                    variant={quickJsonCopied === list.id ? "default" : "outline"}
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={quickJsonLoading === list.id}
                                    onClick={(e) => handleQuickJson(e, list.id, list.displayName)}
                                    title="Copy full list JSON to clipboard"
                                  >
                                    {quickJsonLoading === list.id ? (
                                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : quickJsonCopied === list.id ? (
                                      <ClipboardCheck className="w-3 h-3 mr-1" />
                                    ) : (
                                      <Copy className="w-3 h-3 mr-1" />
                                    )}
                                    {quickJsonCopied === list.id ? 'Copied!' : 'Get JSON'}
                                  </Button>
                                </td>
                                <td className="py-2.5">
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
