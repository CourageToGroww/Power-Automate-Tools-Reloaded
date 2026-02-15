# Toolbox Module

The Toolbox is a Monaco-based JavaScript script editor that allows users to write and execute scripts that interact with authenticated Microsoft 365 services.

## Architecture

The Toolbox module consists of four main files:

### 1. `index.ts` (Background-safe module definition)
- Registers the Toolbox module with the ModuleRegistry
- Defines the module metadata (icon, name, navigation order)
- No URL patterns (Toolbox doesn't intercept requests)
- No API client (Toolbox provides access to other services' APIs)

### 2. `routes.ts` (Frontend-only route registration)
- Registers the ToolboxPage component at `/toolbox`
- Must be called from app.tsx to avoid React imports in background.ts

### 3. `ToolboxProvider.tsx` (Script persistence layer)
- React context provider for script management
- Uses IndexedDB to persist scripts across sessions
- Provides CRUD operations: save, delete, get scripts
- Database: `m365-toolbox`, Store: `scripts`
- Scripts are sorted by `updatedAt` timestamp

### 4. `ToolboxPage.tsx` (Main UI component)
- Monaco editor for JavaScript code editing
- Script list sidebar with create/delete functionality
- Script execution environment with sandboxed context
- Output panel showing results, logs, and errors
- Execution time tracking

## Features

### Script Management
- Create, save, and delete scripts
- Persistent storage in IndexedDB
- Script metadata: name, description, timestamps
- Automatic sorting by last updated

### Code Editing
- Monaco editor with JavaScript syntax highlighting
- Dark theme
- Word wrap enabled
- Auto-layout and line numbers

### Script Execution
- Sandboxed execution using `new Function()`
- NO DOM access (no `window`, `document`, etc.)
- Access to authenticated service APIs via `api` object
- Custom console that captures `log`, `warn`, `error`
- Execution time measurement

### Available APIs
Scripts can access any authenticated Microsoft 365 service:
- `api.graph` - Microsoft Graph API
- `api.sharepoint` - SharePoint API
- `api.intune` - Intune API
- `api.forms` - Microsoft Forms API
- `api.power_automate` - Power Automate API

Each API object has methods:
- `get(url)` - GET request
- `patch(url, data)` - PATCH request
- `post(url, data)` - POST request

### Security
- Scripts run in a sandboxed Function context
- No access to DOM or browser APIs
- Only authenticated service APIs are exposed
- All API calls use intercepted tokens from active sessions

## Example Scripts

### Get Current User
```javascript
const me = await api.graph.get('/me');
console.log('User:', me.displayName);
return me;
```

### List SharePoint Sites
```javascript
const sites = await api.sharepoint.get('/sites');
console.log('Found', sites.value.length, 'sites');
return sites;
```

### Get Power Automate Flows
```javascript
const flows = await api.power_automate.get('/flows');
console.log('Flows:', flows.value.map(f => f.name));
return flows;
```

## UI Layout

### Responsive Design
- Desktop: Sidebar visible by default (264px width)
- Mobile: Sidebar hidden by default, toggle button to show/hide
- Editor fills remaining horizontal space
- Output panel at bottom (max 320px height)

### Components Used
- `Button` - Save, Run, Delete, New, Toggle sidebar
- `Card` - Script list items
- `Badge` - Status badges (success/error), available services
- `ScrollArea` - Script list scrolling

### Theme Support
- Dark mode supported throughout
- Monaco editor uses `vs-dark` theme
- Tailwind dark: classes for output panels

## Authentication

The Toolbox page is accessible without authentication, but displays a warning if no services are authenticated. Scripts cannot execute successfully until at least one service is authenticated.

When a user visits a Microsoft 365 service page, the extension intercepts API requests and captures authentication tokens. These tokens are then available to scripts via the `api` object.

## Integration

### app.tsx
```typescript
import './core/toolbox';
import { registerToolboxRoutes } from './core/toolbox/routes';
import { ToolboxProvider } from './core/toolbox/ToolboxProvider';

registerToolboxRoutes();

// Wrap app with ToolboxProvider
<MultiServiceApiProvider>
  <ToolboxProvider>
    <AppContent />
  </ToolboxProvider>
</MultiServiceApiProvider>
```

### background.ts
```typescript
import './core/toolbox';
```

## Navigation

The Toolbox appears as the last tab in the navigation bar (navOrder: 100) with a "Wrench" icon.

## Future Enhancements

Potential improvements:
- TypeScript support with type checking
- Code snippets and templates
- Import/export scripts
- Script sharing
- Scheduled execution
- Error stack traces
- Autocomplete for API methods
- Script versioning
