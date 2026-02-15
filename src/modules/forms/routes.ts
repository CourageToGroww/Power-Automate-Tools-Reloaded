/**
 * Frontend-only: registers React component routes for the Forms module.
 * Must be imported ONLY from app.tsx (not from background.ts).
 */
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { FormsEditorPage } from './pages/FormsEditorPage';
import { ResponsesPage } from './pages/ResponsesPage';

export function registerFormsRoutes(): void {
  const mod = ModuleRegistry.get('forms');
  if (mod) {
    mod.routes = [
      { path: '/forms', element: FormsEditorPage },
      { path: '/forms/responses', element: ResponsesPage },
    ];
  }
}
