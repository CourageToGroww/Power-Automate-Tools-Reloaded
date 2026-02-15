import React, { useState, useCallback } from 'react';
import { useServiceApi } from '../../../core/providers/MultiServiceApiProvider';
import { Button } from '../../../components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';

interface FormResponse {
  id: string;
  submittedDateTime: string;
  respondentEmail?: string;
  answers: Record<string, any>;
}

interface ResponsesData {
  formId: string;
  formTitle: string;
  responses: FormResponse[];
  totalCount: number;
}

/**
 * Responses page for viewing Microsoft Forms responses.
 * Displays responses in a table format with export capability.
 */
export const ResponsesPage: React.FC = () => {
  const formsApi = useServiceApi('forms');

  const [formId, setFormId] = useState<string>('');
  const [responsesData, setResponsesData] = useState<ResponsesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const isConnected = formsApi !== null && formsApi.isApiReady;

  const handleLoadResponses = useCallback(async () => {
    if (!formsApi) {
      setError(
        'Forms API is not connected. Navigate to Microsoft Forms so the extension can capture an auth token.'
      );
      return;
    }

    const trimmedFormId = formId.trim();
    if (!trimmedFormId) {
      setError('Please enter a form ID.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponsesData(null);
    setCopySuccess(false);

    try {
      // Load form responses via Forms API
      // Endpoint: /formapi/api/forms/{formId}/responses
      const result = await formsApi.get(`/formapi/api/forms/${trimmedFormId}/responses`) as any;

      if (result) {
        const responses: FormResponse[] = [];

        // Parse responses from the API response
        if (result.responses && Array.isArray(result.responses)) {
          responses.push(...result.responses.map((r: any) => ({
            id: r.id || r.responseId,
            submittedDateTime: r.submittedDateTime || r.submitDate,
            respondentEmail: r.responder?.email || r.respondentEmail,
            answers: r.answers || r.responses || {},
          })));
        } else if (Array.isArray(result)) {
          responses.push(...result.map((r: any) => ({
            id: r.id || r.responseId,
            submittedDateTime: r.submittedDateTime || r.submitDate,
            respondentEmail: r.responder?.email || r.respondentEmail,
            answers: r.answers || r.responses || {},
          })));
        }

        setResponsesData({
          formId: trimmedFormId,
          formTitle: result.formTitle || `Form ${trimmedFormId}`,
          responses,
          totalCount: result.totalCount || responses.length,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [formsApi, formId]);

  const handleExportToClipboard = useCallback(() => {
    if (!responsesData) return;

    const exportData = {
      formId: responsesData.formId,
      formTitle: responsesData.formTitle,
      exportedAt: new Date().toISOString(),
      totalResponses: responsesData.totalCount,
      responses: responsesData.responses,
    };

    const jsonString = JSON.stringify(exportData, null, 2);

    navigator.clipboard.writeText(jsonString)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
      })
      .catch(() => {
        setError('Failed to copy to clipboard. Please try again.');
      });
  }, [responsesData]);

  const formatAnswerValue = (value: any): string => {
    if (value === null || value === undefined) return 'No answer';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-full">
      {/* Connection status */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={isConnected ? 'success' : 'destructive'}>
          {isConnected ? 'Connected' : 'Not Connected'}
        </Badge>
        {!isConnected && (
          <span className="text-sm text-muted-foreground">
            Visit Microsoft Forms to capture auth credentials
          </span>
        )}
      </div>

      {/* Form ID input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Load Responses</CardTitle>
          <CardDescription>
            Enter a form ID to view its responses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLoadResponses();
                }
              }}
              placeholder="Enter form ID"
              className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-0"
              aria-label="Form ID"
            />
            <Button
              onClick={handleLoadResponses}
              disabled={isLoading || !isConnected}
              className="sm:w-auto w-full"
            >
              {isLoading ? 'Loading...' : 'Load Responses'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error display */}
      {error && (
        <Card>
          <CardContent className="pt-6">
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4">
              <p className="text-sm text-destructive font-medium">Error</p>
              <p className="text-sm text-destructive/90 mt-1 break-words">
                {error}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Responses data display */}
      {responsesData && !error && (
        <div className="flex flex-col gap-4">
          {/* Response header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle>{responsesData.formTitle}</CardTitle>
                  <CardDescription className="mt-1">
                    Form ID: {responsesData.formId}
                  </CardDescription>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline">
                      {responsesData.totalCount} Response{responsesData.totalCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToClipboard}
                  disabled={responsesData.responses.length === 0}
                  className="sm:w-auto w-full"
                >
                  {copySuccess ? 'Copied!' : 'Export to Clipboard'}
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Responses table */}
          {responsesData.responses.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Responses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="min-w-full inline-block align-middle">
                    <div className="overflow-hidden border rounded-lg">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted">
                          <tr>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                            >
                              Submitted
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                            >
                              Respondent
                            </th>
                            <th
                              scope="col"
                              className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
                            >
                              Answers
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-background divide-y divide-border">
                          {responsesData.responses.map((response) => (
                            <tr key={response.id} className="hover:bg-muted/50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {response.submittedDateTime
                                  ? new Date(response.submittedDateTime).toLocaleString()
                                  : 'Unknown'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {response.respondentEmail || 'Anonymous'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <div className="max-w-md">
                                  {Object.keys(response.answers).length > 0 ? (
                                    <details className="cursor-pointer">
                                      <summary className="text-primary hover:underline">
                                        View {Object.keys(response.answers).length} answer{Object.keys(response.answers).length !== 1 ? 's' : ''}
                                      </summary>
                                      <div className="mt-2 space-y-2 pl-4">
                                        {Object.entries(response.answers).map(([key, value], idx) => (
                                          <div key={idx} className="text-xs">
                                            <span className="font-medium text-muted-foreground">
                                              {key}:
                                            </span>{' '}
                                            <span className="break-words">
                                              {formatAnswerValue(value)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  ) : (
                                    <span className="text-muted-foreground">No answers</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {responsesData.responses.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  This form has no responses yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
