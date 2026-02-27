import React, { useState, useCallback } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';
import { useForms, useFormDetail, useFormResponses, FormInfo } from './useForms';
import { ExportActions } from '../../common/components/ExportActions';
import { useDataSources } from '../../contexts/DataSourceContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ScrollArea } from '../../components/ui/scroll-area';
import { JsonTreeViewer } from '../../components/ui/json-tree-viewer';
import { cn } from '../../lib/utils';
import {
  FileText,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Download,
  Unplug,
  ArrowLeft,
  ClipboardList,
  MessageSquare,
  Calendar,
  User,
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

interface FormDetailViewProps {
  formId: string;
  formTitle: string;
  onBack: () => void;
}

const FormDetailView: React.FC<FormDetailViewProps> = ({ formId, formTitle, onBack }) => {
  const { formDetail, isLoading: isLoadingDetail, error: detailError, refetch: refetchDetail } = useFormDetail(formId);
  const { responses, isLoading: isLoadingResponses, error: responsesError, refetch: refetchResponses } = useFormResponses(formId);
  const [showResponses, setShowResponses] = useState(true);

  const handleExportResponses = useCallback(() => {
    if (responses.length === 0) return;

    const exportData = {
      formId,
      formTitle,
      exportedAt: new Date().toISOString(),
      totalResponses: responses.length,
      responses: responses.map(r => ({
        id: r.id,
        submitDate: r.submitDate,
        respondent: r.respondent,
        answers: r.answers,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // Sanitize the title for use in a filename
    const safeTitle = formTitle.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    link.download = `${safeTitle}_responses.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [responses, formId, formTitle]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold truncate">{formTitle}</h2>
          {formDetail?.form.description && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {formDetail.form.description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refetchDetail}
          disabled={isLoadingDetail}
          className="shrink-0"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 mr-1', isLoadingDetail && 'animate-spin')} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {detailError && <ErrorMessage message={detailError} onRetry={refetchDetail} />}

      {/* Form structure / questions */}
      {isLoadingDetail ? (
        <LoadingSpinner label="Loading form structure..." />
      ) : formDetail && formDetail.questions.length > 0 ? (
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-muted-foreground" />
                Questions
              </CardTitle>
              <Badge variant="secondary">{formDetail.questions.length}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="space-y-2">
              {formDetail.questions
                .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                .map((question, index) => (
                  <Card key={question.id} className="bg-muted/20">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <span className="text-xs text-muted-foreground font-mono shrink-0 mt-0.5">
                          Q{index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium">{question.displayName}</p>
                            <div className="flex items-center gap-1 shrink-0">
                              {question.questionType && (
                                <Badge variant="outline" className="text-xs">
                                  {question.questionType}
                                </Badge>
                              )}
                              {question.isRequired && (
                                <Badge variant="default" className="text-xs">
                                  Required
                                </Badge>
                              )}
                            </div>
                          </div>
                          {question.choices && question.choices.length > 0 && (
                            <div className="mt-2 space-y-1">
                              <p className="text-xs text-muted-foreground">Choices:</p>
                              <div className="flex flex-wrap gap-1">
                                {question.choices.map((choice, ci) => (
                                  <Badge key={ci} variant="secondary" className="text-xs">
                                    {choice.displayName}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {question.allowMultipleAnswers && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Multiple answers allowed
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : formDetail && formDetail.questions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No question structure available. The form details may be limited by API permissions.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* Responses section */}
      <Card>
        <CardHeader
          className="cursor-pointer py-3 px-4"
          onClick={() => setShowResponses(!showResponses)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-sm">Responses</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{responses.length}</Badge>
              {responses.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExportResponses();
                  }}
                  className="h-7 px-2 text-xs"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Export
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  refetchResponses();
                }}
                disabled={isLoadingResponses}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', isLoadingResponses && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        {showResponses && (
          <CardContent className="pt-0 px-4 pb-4">
            {responsesError && <ErrorMessage message={responsesError} onRetry={refetchResponses} />}
            {isLoadingResponses ? (
              <LoadingSpinner label="Loading responses..." />
            ) : responses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No responses found for this form.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 px-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">#</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden sm:table-cell">Respondent</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground hidden md:table-cell">Submitted</th>
                      <th className="text-left py-2 pr-4 font-medium text-muted-foreground">Answers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((response, index) => (
                      <tr key={response.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                          {index + 1}
                        </td>
                        <td className="py-2.5 pr-4 hidden sm:table-cell">
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">
                              {response.respondent || 'Anonymous'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 pr-4 text-xs text-muted-foreground hidden md:table-cell">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {formatDate(response.submitDate)}
                          </div>
                        </td>
                        <td className="py-2.5 pr-4">
                          <JsonTreeViewer
                            data={response.answers}
                            defaultExpanded={0}
                            className="text-xs border-0 shadow-none"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export const FormsPage: React.FC = () => {
  const client = useServiceApi('forms');
  const { forms, isLoading, error, refetch, isReady } = useForms();
  const { activeSource } = useDataSources();
  const [selectedForm, setSelectedForm] = useState<FormInfo | null>(null);

  if (!client.isReady && !isReady) {
    return <NotConnected />;
  }

  // Form detail view
  if (selectedForm) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="p-4 md:p-6 border-b">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">Forms</h1>
          <p className="text-muted-foreground text-sm mt-1">{selectedForm.title}</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6">
            <FormDetailView
              formId={selectedForm.id}
              formTitle={selectedForm.title}
              onBack={() => setSelectedForm(null)}
            />
          </div>
        </ScrollArea>
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
              Browse forms and view responses
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
