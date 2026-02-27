import React, { useState, useMemo } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';
import { useForms, FormInfo } from './useForms';
import { useDataSources } from '../../contexts/DataSourceContext';
import { ExportActions } from '../../common/components/ExportActions';
import { ServiceEditor } from '../../common/components/ServiceEditor';
import { FORMS_TABS } from './formsEditorConfig';
import type { ServiceContext } from '../../common/types/serviceEditor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { cn } from '../../lib/utils';
import {
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Unplug,
  ArrowLeft,
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
        <h2 className="text-xl font-semibold mb-2">Forms Not Connected</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Connect to Microsoft Forms by visiting forms.office.com in your browser.
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

export const FormsPage: React.FC = () => {
  const client = useServiceApi('forms');
  const { forms, isLoading, error, refetch, isReady } = useForms();
  const { activeSource } = useDataSources();
  const [selectedForm, setSelectedForm] = useState<FormInfo | null>(null);

  const editorContext = useMemo<ServiceContext>(() => ({
    client,
    formId: selectedForm?.id || '',
  }), [client, selectedForm?.id]);

  if (!client.isReady && !isReady) {
    return <NotConnected />;
  }

  // Form detail view with ServiceEditor
  if (selectedForm) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="px-4 py-3 border-b flex items-center gap-3 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedForm(null)}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold truncate">{selectedForm.title}</h1>
            <p className="text-xs text-muted-foreground">Forms Editor</p>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <ServiceEditor
            tabs={FORMS_TABS}
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
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Forms</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Browse forms, edit structure, and view responses
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
            disabled={isLoading}
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6 space-y-4">
          {/* Export Actions */}
          <ExportActions
            serviceType="forms"
            context={{
              formId: activeSource?.context?.formId || '',
              tenantId: activeSource?.context?.tenantId || '',
              userId: activeSource?.context?.userId || '',
            }}
          />

          {error && <ErrorMessage message={error} onRetry={refetch} />}

          {isLoading ? (
            <LoadingSpinner label="Loading forms..." />
          ) : forms.length === 0 && !error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                <p className="text-lg font-medium text-muted-foreground">No forms found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Forms you have created or have access to will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {forms.map((form) => (
                <Card
                  key={form.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => setSelectedForm(form)}
                >
                  <CardHeader className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">{form.title}</CardTitle>
                        {form.description && (
                          <CardDescription className="text-xs mt-1 line-clamp-2">
                            {form.description}
                          </CardDescription>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {form.status && (
                            <Badge variant="outline" className="text-xs">{form.status}</Badge>
                          )}
                          {form.lastModifiedDateTime && (
                            <span className="text-xs text-muted-foreground">
                              {formatDate(form.lastModifiedDateTime)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
