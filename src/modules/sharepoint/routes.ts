/**
 * Frontend-only: registers React component routes for the SharePoint module.
 * Must be imported ONLY from app.tsx (not from background.ts).
 */
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { ListsPage } from './pages/ListsPage';
import { ColumnFormattingPage } from './pages/ColumnFormattingPage';
import { PermissionsPage } from './pages/PermissionsPage';

export function registerSharePointRoutes(): void {
  const mod = ModuleRegistry.get('sharepoint');
  if (mod) {
    mod.routes = [
      { path: '/sharepoint', element: ListsPage },
      { path: '/sharepoint/formatting', element: ColumnFormattingPage },
      { path: '/sharepoint/permissions', element: PermissionsPage },
    ];
  }
}
