import React, { useState, useEffect, useCallback } from 'react';
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

interface FormQuestion {
  id: string;
  title: string;
  type: string;
  required?: boolean;
  choices?: string[];
}

interface FormData {
  id: string;
  title: string;
  description?: string;
  questions: FormQuestion[];
}

interface FormListItem {
  id: string;
  title: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

/**
 * Forms Editor page for viewing and managing Microsoft Forms.
 * Displays form structure with questions and their types.
 */
export const FormsEditorPage: React.FC = () => {
  const formsApi = useServiceApi('forms');

  const [formId, setFormId] = useState<string>('');
  const [formData, setFormData] = useState<FormData | null>(null);
  const [formsList, setFormsList] = useState<FormListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFormsList, setShowFormsList] = useState(true);

  const isConnected = formsApi !== null && formsApi.isApiReady;

  // Load list of user's forms on mount
  useEffect(() => {
    if (!isConnected || !showFormsList) return;

    const loadFormsList = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Try to get forms list via Graph API or Forms API
        // Forms API endpoint: /formapi/api/forms
        const result = await formsApi.get('/formapi/api/forms') as any;

        if (result && Array.isArray(result.value)) {
          setFormsList(result.value.map((form: any) => ({
            id: form.id,
            title: form.title || 'Untitled Form',
            createdDateTime: form.createdDateTime,
            lastModifiedDateTime: form.lastModifiedDateTime,
          })));
        } else if (result && Array.isArray(result)) {
          setFormsList(result.map((form: any) => ({
            id: form.id,
            title: form.title || 'Untitled Form',
            createdDateTime: form.createdDateTime,
            lastModifiedDateTime: form.lastModifiedDateTime,
          })));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(`Failed to load forms list: ${message}`);
      } finally {
        setIsLoading(false);
      }
    };

    loadFormsList();
  }, [formsApi, isConnected, showFormsList]);

  const handleLoadForm = useCallback(async () => {
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
    setFormData(null);
    setShowFormsList(false);

    try {
      // Load form data via Forms API
      // Endpoint: /formapi/api/forms/{formId}
      const result = await formsApi.get(`/formapi/api/forms/${trimmedFormId}`) as any;

      if (result) {
        const questions: FormQuestion[] = [];

        // Parse questions from the form response
        if (result.questions && Array.isArray(result.questions)) {
          questions.push(...result.questions.map((q: any) => ({
            id: q.id,
            title: q.title || q.questionText || 'Untitled Question',
            type: q.type || q.questionType || 'Unknown',
            required: q.required || false,
            choices: q.choices || q.options || [],
          })));
        }

        setFormData({
          id: result.id,
          title: result.title || 'Untitled Form',
          description: result.description,
          questions,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [formsApi, formId]);

  const handleSelectForm = useCallback((selectedFormId: string) => {
    setFormId(selectedFormId);
    setShowFormsList(false);
    // Trigger load with the selected form ID
    setTimeout(() => {
      const loadButton = document.querySelector('[data-load-form]') as HTMLButtonElement;
      if (loadButton) loadButton.click();
    }, 0);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowFormsList(true);
    setFormData(null);
    setFormId('');
    setError(null);
  }, []);

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
      {!showFormsList && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Load Form</CardTitle>
            <CardDescription>
              Enter a form ID to view its structure and questions
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
                    handleLoadForm();
                  }
                }}
                placeholder="Enter form ID"
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-w-0"
                aria-label="Form ID"
              />
              <Button
                onClick={handleLoadForm}
                disabled={isLoading || !isConnected}
                className="sm:w-auto w-full"
                data-load-form
              >
                {isLoading ? 'Loading...' : 'Load Form'}
              </Button>
              <Button
                variant="outline"
                onClick={handleBackToList}
                className="sm:w-auto w-full"
              >
                Back to List
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forms list */}
      {showFormsList && formsList.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Forms</CardTitle>
            <CardDescription>
              Select a form to view its structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {formsList.map((form) => (
                <button
                  key={form.id}
                  onClick={() => handleSelectForm(form.id)}
                  className="flex flex-col gap-1 p-3 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                >
                  <div className="font-medium">{form.title}</div>
                  <div className="text-xs text-muted-foreground">
                    ID: {form.id}
                  </div>
                  {form.lastModifiedDateTime && (
                    <div className="text-xs text-muted-foreground">
                      Modified: {new Date(form.lastModifiedDateTime).toLocaleDateString()}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {showFormsList && formsList.length === 0 && !isLoading && isConnected && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              No forms found. You can manually enter a form ID using the button below.
            </p>
            <div className="flex justify-center mt-4">
              <Button onClick={() => setShowFormsList(false)}>
                Enter Form ID Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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

      {/* Form data display */}
      {formData && !error && (
        <div className="flex flex-col gap-4">
          {/* Form header */}
          <Card>
            <CardHeader>
              <CardTitle>{formData.title}</CardTitle>
              {formData.description && (
                <CardDescription>{formData.description}</CardDescription>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline">ID: {formData.id}</Badge>
                <Badge variant="outline">
                  {formData.questions.length} Question{formData.questions.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Questions list */}
          {formData.questions.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3">
                  {formData.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="p-4 rounded-md border border-input bg-background"
                    >
                      <div className="flex items-start gap-2 flex-wrap">
                        <Badge variant="outline" className="shrink-0">
                          Q{index + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium break-words">
                            {question.title}
                            {question.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <Badge variant="secondary">{question.type}</Badge>
                            {question.required && (
                              <Badge variant="outline">Required</Badge>
                            )}
                          </div>
                          {question.choices && question.choices.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-muted-foreground mb-1">
                                Choices:
                              </div>
                              <ul className="list-disc list-inside text-sm">
                                {question.choices.map((choice, idx) => (
                                  <li key={idx} className="break-words">{choice}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {formData.questions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground text-center">
                  This form has no questions yet.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
