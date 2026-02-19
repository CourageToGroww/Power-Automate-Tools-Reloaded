import { useState, useEffect, useCallback } from 'react';
import { useServiceApi } from '../../common/providers/MultiServiceApiProvider';

export interface FormInfo {
  id: string;
  title: string;
  description?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  status?: string;
  createdBy?: {
    displayName?: string;
    email?: string;
  };
}

export interface FormQuestion {
  id: string;
  displayName: string;
  questionType?: string;
  isRequired?: boolean;
  sequence?: number;
  choices?: Array<{
    displayName: string;
    value?: string;
  }>;
  allowMultipleAnswers?: boolean;
}

export interface FormResponse {
  id: string;
  submitDate?: string;
  respondent?: string;
  answers: Record<string, unknown>;
}

export interface FormDetail {
  form: FormInfo;
  questions: FormQuestion[];
}

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useForms() {
  const client = useServiceApi('forms');
  const [state, setState] = useState<AsyncState<FormInfo[]>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchForms = useCallback(async () => {
    if (!client.isReady) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Microsoft Forms does not have a fully public Graph API for listing forms.
      // This uses the available endpoint pattern; the actual endpoint may vary
      // depending on tenant configuration and Graph API version.
      const resp = await client.get('/me/drive/root/search(q=\'.form\')') as {
        value?: Record<string, unknown>[];
      };

      // Fallback: Try the beta forms endpoint
      let forms: FormInfo[] = [];
      try {
        const formsResp = await client.get('/me/forms') as {
          value?: Record<string, unknown>[];
        };
        forms = (formsResp?.value || []).map((f: Record<string, unknown>) => ({
          id: String(f.id || ''),
          title: String(f.title || f.displayName || 'Untitled Form'),
          description: f.description ? String(f.description) : undefined,
          createdDateTime: f.createdDateTime ? String(f.createdDateTime) : undefined,
          lastModifiedDateTime: f.lastModifiedDateTime ? String(f.lastModifiedDateTime) : undefined,
          status: f.status ? String(f.status) : undefined,
          createdBy: f.createdBy as FormInfo['createdBy'],
        }));
      } catch {
        // If the forms endpoint fails, map from drive search results
        forms = (resp?.value || []).map((f: Record<string, unknown>) => ({
          id: String(f.id || ''),
          title: String(f.name || 'Untitled Form'),
          description: f.description ? String(f.description) : undefined,
          createdDateTime: f.createdDateTime ? String(f.createdDateTime) : undefined,
          lastModifiedDateTime: f.lastModifiedDateTime ? String(f.lastModifiedDateTime) : undefined,
          status: undefined,
          createdBy: f.createdBy
            ? {
                displayName: (f.createdBy as Record<string, unknown>)?.user
                  ? String(((f.createdBy as Record<string, unknown>).user as Record<string, unknown>)?.displayName || '')
                  : undefined,
              }
            : undefined,
        }));
      }

      setState({ data: forms, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch forms';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [client.isReady]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  return {
    forms: state.data || [],
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchForms,
    isReady: client.isReady,
  };
}

export function useFormDetail(formId: string | null) {
  const client = useServiceApi('forms');
  const [state, setState] = useState<AsyncState<FormDetail>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchFormDetail = useCallback(async () => {
    if (!client.isReady || !formId) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const resp = await client.get(`/me/forms/${formId}`) as Record<string, unknown>;

      const form: FormInfo = {
        id: String(resp.id || formId),
        title: String(resp.title || resp.displayName || 'Untitled Form'),
        description: resp.description ? String(resp.description) : undefined,
        createdDateTime: resp.createdDateTime ? String(resp.createdDateTime) : undefined,
        lastModifiedDateTime: resp.lastModifiedDateTime ? String(resp.lastModifiedDateTime) : undefined,
        status: resp.status ? String(resp.status) : undefined,
      };

      // Fetch questions
      let questions: FormQuestion[] = [];
      try {
        const questionsResp = await client.get(`/me/forms/${formId}/questions`) as {
          value?: Record<string, unknown>[];
        };
        questions = (questionsResp?.value || []).map((q: Record<string, unknown>) => ({
          id: String(q.id || ''),
          displayName: String(q.displayName || q.text || 'Untitled Question'),
          questionType: q.questionType ? String(q.questionType) : undefined,
          isRequired: typeof q.isRequired === 'boolean' ? q.isRequired : undefined,
          sequence: typeof q.sequence === 'number' ? q.sequence : undefined,
          choices: Array.isArray(q.choices)
            ? q.choices.map((c: Record<string, unknown>) => ({
                displayName: String(c.displayName || c.value || ''),
                value: c.value ? String(c.value) : undefined,
              }))
            : undefined,
          allowMultipleAnswers: typeof q.allowMultipleAnswers === 'boolean' ? q.allowMultipleAnswers : undefined,
        }));
      } catch {
        // Questions endpoint may not be available
      }

      setState({
        data: { form, questions },
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch form details';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [client.isReady, formId]);

  useEffect(() => {
    if (formId) {
      fetchFormDetail();
    } else {
      setState({ data: null, isLoading: false, error: null });
    }
  }, [formId, fetchFormDetail]);

  return {
    formDetail: state.data,
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchFormDetail,
  };
}

export function useFormResponses(formId: string | null) {
  const client = useServiceApi('forms');
  const [state, setState] = useState<AsyncState<FormResponse[]>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetchResponses = useCallback(async () => {
    if (!client.isReady || !formId) return;
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const resp = await client.get(`/me/forms/${formId}/responses?$top=100`) as {
        value?: Record<string, unknown>[];
      };
      const responses: FormResponse[] = (resp?.value || []).map((r: Record<string, unknown>) => ({
        id: String(r.id || ''),
        submitDate: r.submitDate ? String(r.submitDate) : r.submittedDateTime ? String(r.submittedDateTime) : undefined,
        respondent: r.respondent ? String(r.respondent) : r.respondentEmailAddress ? String(r.respondentEmailAddress) : undefined,
        answers: (r.answers || r.fields || {}) as Record<string, unknown>,
      }));
      setState({ data: responses, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch form responses';
      setState(prev => ({ ...prev, isLoading: false, error: message }));
    }
  }, [client.isReady, formId]);

  useEffect(() => {
    if (formId) {
      fetchResponses();
    } else {
      setState({ data: null, isLoading: false, error: null });
    }
  }, [formId, fetchResponses]);

  return {
    responses: state.data || [],
    isLoading: state.isLoading,
    error: state.error,
    refetch: fetchResponses,
  };
}
