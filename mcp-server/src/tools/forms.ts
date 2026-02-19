import * as Forms from '../clients/FormsClient';

export function getFormsToolDefs() {
  return [
    {
      name: 'forms_list_forms',
      description: 'List Microsoft Forms (limited API support, uses workaround)',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'forms_get_form',
      description: 'Get Microsoft Form details (limited API support)',
      inputSchema: {
        type: 'object' as const,
        properties: {
          formId: { type: 'string', description: 'Form ID' },
        },
        required: ['formId'],
      },
    },
    {
      name: 'forms_list_responses',
      description: 'List responses for a Microsoft Form (limited API support)',
      inputSchema: {
        type: 'object' as const,
        properties: {
          formId: { type: 'string', description: 'Form ID' },
        },
        required: ['formId'],
      },
    },
    {
      name: 'forms_export_responses',
      description: 'Export all responses for a Microsoft Form (limited API support)',
      inputSchema: {
        type: 'object' as const,
        properties: {
          formId: { type: 'string', description: 'Form ID' },
        },
        required: ['formId'],
      },
    },
  ];
}

export async function handleFormsTool(name: string, args: any) {
  try {
    switch (name) {
      case 'forms_list_forms':
        return ok(await Forms.listForms());
      case 'forms_get_form':
        return ok(await Forms.getForm(args.formId));
      case 'forms_list_responses':
        return ok(await Forms.listResponses(args.formId));
      case 'forms_export_responses':
        return ok(await Forms.exportResponses(args.formId));
      default:
        return err(`Unknown tool: ${name}`);
    }
  } catch (e: any) {
    return err(e.message);
  }
}

function ok(data: any) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

function err(msg: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${msg}` }], isError: true };
}
