# NavBar Component Documentation

## Purpose and Functionality Overview
Navigation bar component that provides application branding and tab-based navigation between different features of the Power Automate Tools extension. Supports routing between Flow Editor, Flow Failures, and AI Assistance pages.

## Dependencies and Imports
- `@fluentui/react/lib/Icon` - Icon component for branding
- `@fluentui/react/lib/Pivot` - Tab navigation component
- `@fluentui/react/lib/Stack` - Layout component
- `@fluentui/react/lib/Styling` - CSS-in-JS styling
- `react-router-dom` - useLocation, useNavigate for routing

## Component Documentation

### NavBar
Functional component that renders the application navigation bar.

**Props:** None

**Features:**
- Application branding with icon and title
- Tab-based navigation using Fluent UI Pivot
- Automatic route detection and tab highlighting
- Responsive layout with horizontal alignment

## Usage Examples

```typescript
// Basic usage in App component
import { NavBar } from './common/components/NavBar';

function App() {
  return (
    <div>
      <NavBar />
      {/* Rest of application */}
    </div>
  );
}

// Navigation is automatic - clicking tabs navigates to:
// - "Flow Editor" tab -> "/" route
// - "Flow Failures" tab -> "/failures" route
// - "AI Assistance" tab -> "/ai-assistance" route
```

## Integration Points
- **React Router**: Uses `useLocation()` to detect current route and `useNavigate()` for navigation
- **App Component**: Rendered as the top-level navigation component
- **FlowEditorPage**: Accessible via the "Flow Editor" tab
- **FlowFailuresPage**: Accessible via the "Flow Failures" tab
- **AIAssistancePage**: Accessible via the "AI Assistance" tab

## Configuration Requirements
- Must be wrapped in a Router component (HashRouter in this application)
- Requires routing configuration for "/", "/failures", and "/ai-assistance" paths

## Error Handling Approach
- **Route Detection**: Gracefully handles unknown routes (defaults to editor tab)
- **Navigation Failures**: React Router handles navigation errors automatically
- **Missing Dependencies**: Component will fail to render if Router context is missing

## Performance Considerations
- **Lightweight Rendering**: Minimal state and props for fast rendering
- **Route Optimization**: Uses React Router's optimized navigation
- **Style Caching**: CSS-in-JS styles are cached for performance

## Component Structure

### Layout
```
NavBar (Stack horizontal)
├── App Title Section
│   ├── Icon (TriggerAuto)
│   └── Text ("Power Automate Tools")
└── Navigation Section
    └── Pivot (Tab Navigation)
        ├── PivotItem ("Flow Editor")
        ├── PivotItem ("Flow Failures")
        └── PivotItem ("AI Assistance")
```

### Styling Classes
- `navBarStyles`: Main navigation bar styling with background and border
- `appTitleStyles`: Application title styling with font weight and padding
- `pivotStyles`: Tab navigation styling with left padding

## Future Extension Guidelines

### TO EXTEND THIS COMPONENT:
1. **Add new tabs**: Add additional PivotItem components for new features
2. **Add user information**: Include user profile or environment info in the nav bar
3. **Add search functionality**: Add a search box for finding flows or runs
4. **Add breadcrumbs**: Show current flow context in the navigation
5. **Add theme switching**: Add controls for light/dark theme switching

### INTEGRATION POINTS:
- Connect to user authentication for personalized navigation
- Integrate with flow context for showing current flow information
- Connect to settings for user preferences

### PERFORMANCE NOTES:
- Keep navigation state minimal to avoid unnecessary re-renders
- Consider memoizing navigation items if they become dynamic

## Accessibility Considerations
- **Keyboard Navigation**: Full keyboard support via Fluent UI Pivot
- **Screen Readers**: Proper ARIA labels and navigation landmarks
- **High Contrast**: Styling supports high contrast themes
- **Focus Management**: Proper focus handling for tab navigation

## Responsive Design
- **Horizontal Layout**: Uses Stack horizontal for responsive layout
- **Flexible Spacing**: Tabs adjust to available space
- **Mobile Considerations**: Fluent UI Pivot handles mobile responsiveness

## Testing Considerations
- **Route Testing**: Test navigation between different routes
- **Active State**: Test that correct tab is highlighted based on current route
- **Router Integration**: Test that navigation triggers proper route changes
- **Accessibility**: Test keyboard navigation and screen reader support

## Change History
- **[2024-01-XX]**: Added AI Assistance tab for AI-powered flow modifications
  - Renamed "Graph Endpoints" tab to "AI Assistance" tab in Pivot navigation
  - Updated route detection logic to handle "/ai-assistance" path
  - Added navigation handler for AI Assistance page
  - Updated documentation to reflect new AI assistance functionality
- **[2024-12-19]**: Updated to include tab-based navigation
  - Added Pivot component for tab navigation
  - Integrated with React Router for route management
  - Added Flow Failures tab alongside existing Flow Editor
  - Updated styling for better visual hierarchy
  - Added proper route detection and navigation handling

## Previous Version Notes
- **Original**: Simple branding bar with just title and icon
- **Current**: Full navigation with tabs and routing integration 