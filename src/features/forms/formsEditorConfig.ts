/**
 * Forms editor tab configurations.
 * Adding a new Forms feature = adding an entry to FORMS_TABS.
 */
import type { EditorTabConfig, ServiceContext, SaveResult } from '../../common/types/serviceEditor';

// ── Tab 1: Form Structure (questions) ───────────────────────────────────────

async function fetchFormStructure(ctx: ServiceContext): Promise<unknown> {
  const { client, formId } = ctx;
  if (!client || !formId) throw new Error('Missing formId');

  // Fetch form metadata + questions
  const [formResp, questionsResp] = await Promise.all([
    client.get(`/me/forms/${formId}`) as Promise<any>,
    client.get(`/me/forms/${formId}/questions`) as Promise<any>,
  ]).catch(async () => {
    // Fallback: try individually
    const form = await client.get(`/me/forms/${formId}`) as any;
    let questions: any = { value: [] };
    try {
      questions = await client.get(`/me/forms/${formId}/questions`) as any;
    } catch {
      // Questions endpoint may not be available
    }
    return [form, questions];
  });

  return {
    form: formResp || {},
    questions: questionsResp?.value || [],
  };
}

async function saveFormStructure(ctx: ServiceContext, original: unknown, modified: unknown): Promise<SaveResult> {
  const { client, formId } = ctx;
  if (!client || !formId) throw new Error('Missing formId');

  const origData = original as any;
  const modData = modified as any;
  const results: Array<{ id: string; success: boolean; error?: string }> = [];

  // Update form metadata if changed
  if (JSON.stringify(origData.form) !== JSON.stringify(modData.form)) {
    const { id, createdDateTime, lastModifiedDateTime, createdBy, ...formUpdate } = modData.form;
    try {
      await client.patch(`/me/forms/${formId}`, formUpdate);
      results.push({ id: 'form-metadata', success: true });
    } catch (err: any) {
      results.push({ id: 'form-metadata', success: false, error: err.message });
    }
  }

  // Update questions if changed
  const origQuestions = origData.questions || [];
  const modQuestions = modData.questions || [];
  const origQMap = new Map<string, any>();
  for (const q of origQuestions) {
    if (q.id) origQMap.set(q.id, q);
  }

  for (const q of modQuestions) {
    if (!q.id) continue;
    const orig = origQMap.get(q.id);
    if (!orig || JSON.stringify(orig) === JSON.stringify(q)) continue;

    const { id, ...updateFields } = q;
    try {
      await client.patch(`/me/forms/${formId}/questions/${q.id}`, updateFields);
      results.push({ id: q.id, success: true });
    } catch (err: any) {
      results.push({ id: q.id, success: false, error: err.message });
    }
  }

  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    return {
      success: false,
      message: `${results.length - failures.length} updated, ${failures.length} failed`,
      itemResults: results,
    };
  }
  return {
    success: true,
    message: results.length > 0 ? `${results.length} item(s) updated` : 'No changes detected',
    itemResults: results,
  };
}

// ── Tab 2: Form Settings ────────────────────────────────────────────────────

async function fetchFormSettings(ctx: ServiceContext): Promise<unknown> {
  const { client, formId } = ctx;
  if (!client || !formId) throw new Error('Missing formId');

  const resp = await client.get(`/me/forms/${formId}`) as any;
  // Return only settings-relevant fields
  const { id, title, description, status, settings, isQuiz, allowMultipleResponses,
    isAnonymous, closeDateTime, startDateTime, ...rest } = resp || {};

  return {
    title,
    description,
    status,
    isQuiz: isQuiz || false,
    allowMultipleResponses: allowMultipleResponses || false,
    isAnonymous: isAnonymous || false,
    closeDateTime: closeDateTime || null,
    startDateTime: startDateTime || null,
    settings: settings || {},
  };
}

async function saveFormSettings(ctx: ServiceContext, _original: unknown, modified: unknown): Promise<SaveResult> {
  const { client, formId } = ctx;
  if (!client || !formId) throw new Error('Missing formId');

  try {
    await client.patch(`/me/forms/${formId}`, modified);
    return { success: true, message: 'Form settings updated successfully' };
  } catch (err: any) {
    return { success: false, message: `Failed to update settings: ${err.message}` };
  }
}

// ── Tab 3: Responses (read-only) ────────────────────────────────────────────

async function fetchResponses(ctx: ServiceContext): Promise<unknown> {
  const { client, formId } = ctx;
  if (!client || !formId) throw new Error('Missing formId');

  const resp = await client.get(`/me/forms/${formId}/responses?$top=500`) as any;
  return resp?.value || [];
}

// ── Export ───────────────────────────────────────────────────────────────────

export const FORMS_TABS: EditorTabConfig[] = [
  {
    id: 'forms-structure',
    label: 'Structure',
    description: 'View and edit form questions and layout',
    service: 'forms',
    fetchData: fetchFormStructure,
    saveData: saveFormStructure,
    requiresContext: ['formId'],
  },
  {
    id: 'forms-settings',
    label: 'Settings',
    description: 'View and edit form configuration',
    service: 'forms',
    fetchData: fetchFormSettings,
    saveData: saveFormSettings,
    requiresContext: ['formId'],
  },
  {
    id: 'forms-responses',
    label: 'Responses',
    description: 'View form responses',
    service: 'forms',
    fetchData: fetchResponses,
    saveData: null,
    readOnly: true,
    requiresContext: ['formId'],
  },
];
