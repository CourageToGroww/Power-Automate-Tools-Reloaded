import * as Intune from '../clients/IntuneClient';

export function getIntuneToolDefs() {
  return [
    {
      name: 'intune_list_devices',
      description: 'List Intune managed devices',
      inputSchema: {
        type: 'object' as const,
        properties: {
          top: { type: 'number', description: 'Number of devices to retrieve' },
        },
      },
    },
    {
      name: 'intune_get_device',
      description: 'Get details of a specific Intune managed device',
      inputSchema: {
        type: 'object' as const,
        properties: {
          deviceId: { type: 'string', description: 'Device ID' },
        },
        required: ['deviceId'],
      },
    },
    {
      name: 'intune_list_policies',
      description: 'List Intune device compliance policies',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'intune_list_apps',
      description: 'List Intune mobile apps',
      inputSchema: {
        type: 'object' as const,
        properties: {},
      },
    },
    {
      name: 'intune_get_compliance_status',
      description: 'Get compliance status for a specific device',
      inputSchema: {
        type: 'object' as const,
        properties: {
          deviceId: { type: 'string', description: 'Device ID' },
        },
        required: ['deviceId'],
      },
    },
  ];
}

export async function handleIntuneTool(name: string, args: any) {
  try {
    switch (name) {
      case 'intune_list_devices':
        return ok(await Intune.listDevices(args.top));
      case 'intune_get_device':
        return ok(await Intune.getDevice(args.deviceId));
      case 'intune_list_policies':
        return ok(await Intune.listPolicies());
      case 'intune_list_apps':
        return ok(await Intune.listApps());
      case 'intune_get_compliance_status':
        return ok(await Intune.getComplianceStatus(args.deviceId));
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
