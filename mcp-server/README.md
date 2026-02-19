# M365 Workbench MCP Server

Node.js MCP server that bridges M365 auth tokens from a Chrome extension to Claude Code.

## Architecture

- **Chrome Extension** captures auth tokens from M365 services
- **HTTP Relay** (port 8321) receives credentials from extension
- **MCP Server** (stdio) exposes M365 APIs as tools to Claude Code
- **Native Messaging Host** (optional) for Chrome native messaging

## Installation

```bash
npm install
npm run build
```

## Usage

### As MCP Server (stdio)

Add to Claude Code MCP settings:

```json
{
  "mcpServers": {
    "m365-workbench": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/dist/index.js"]
    }
  }
}
```

### As Native Messaging Host

1. Update `native-host-manifest.json` with the absolute path to `dist/native-host.js`
2. Update `allowed_origins` with your Chrome extension ID
3. Install manifest:
   - **Linux/Mac**: Copy to `~/.config/google-chrome/NativeMessagingHosts/com.m365workbench.relay.json`
   - **Windows**: Create registry key at `HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.m365workbench.relay`

## Available Tools

### Power Automate
- `pa_get_flow` - Get flow definition
- `pa_list_runs` - List flow runs
- `pa_get_run` - Get run details
- `pa_get_failed_runs` - Get failed runs
- `pa_update_flow` - Update flow definition

### SharePoint
- `sp_get_site` - Get site info
- `sp_list_lists` - List all lists
- `sp_get_list_schema` - Get list columns
- `sp_get_list_items` - Get list items
- `sp_get_column_formatting` - Get column formatting
- `sp_get_content_types` - Get content types
- `sp_get_site_pages` - Get site pages

### Intune
- `intune_list_devices` - List managed devices
- `intune_get_device` - Get device details
- `intune_list_policies` - List compliance policies
- `intune_list_apps` - List mobile apps
- `intune_get_compliance_status` - Get device compliance

### Microsoft Forms
- `forms_list_forms` - List forms (limited API support)
- `forms_get_form` - Get form details
- `forms_list_responses` - List responses
- `forms_export_responses` - Export all responses

### Microsoft Graph
- `graph_query` - Custom Graph API query
- `graph_get_me` - Get current user
- `graph_list_sites` - List SharePoint sites
- `graph_list_groups` - List M365 groups
- `graph_search` - Search M365 content

### Status
- `get_auth_status` - Check authentication status

## API Endpoints (HTTP Relay)

- `POST /api/credentials` - Store credentials
- `GET /api/credentials?service=X` - Get credentials
- `GET /api/status` - Get auth status

## Security

- HTTP relay binds to 127.0.0.1 only (localhost)
- Credentials stored in-memory only (not persisted)
- CORS enabled for local extension access
