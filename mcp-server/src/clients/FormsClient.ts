import { graphGet } from './GraphClient';

// Note: Microsoft Forms API has limited Graph API support.
// These methods use available endpoints and workarounds.

export async function listForms() {
  // Workaround: Search for .form files in OneDrive
  // This may not return all forms, as Forms API support is limited
  try {
    return await graphGet(`/me/drive/root/search(q='.form')`, 'forms');
  } catch (err: any) {
    throw new Error(`Forms listing not fully supported by Graph API: ${err.message}`);
  }
}

export async function getForm(formId: string) {
  // Attempt to use beta API for Forms
  try {
    // Beta endpoint - may not be available in all tenants
    return await graphGet(`https://graph.microsoft.com/beta/forms/${formId}`, 'forms');
  } catch (err: any) {
    throw new Error(`Forms API limited support: ${err.message}. Try using Forms web interface.`);
  }
}

export async function listResponses(formId: string) {
  try {
    return await graphGet(`https://graph.microsoft.com/beta/forms/${formId}/responses`, 'forms');
  } catch (err: any) {
    throw new Error(`Forms responses API limited support: ${err.message}`);
  }
}

export async function exportResponses(formId: string) {
  // Same as listResponses but attempts to get all pages
  try {
    const result = await graphGet(`https://graph.microsoft.com/beta/forms/${formId}/responses`, 'forms');

    // If there's pagination, we could fetch more pages here
    // For now, return the first page
    return result;
  } catch (err: any) {
    throw new Error(`Forms export API limited support: ${err.message}`);
  }
}
