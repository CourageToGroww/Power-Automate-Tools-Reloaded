/**
 * Frontend-only: registers React component routes for the Toolbox module.
 * Must be imported ONLY from app.tsx (not from background.ts).
 */
import { ModuleRegistry } from '../modules/ModuleRegistry';
import { ToolboxPage } from './ToolboxPage';

export function registerToolboxRoutes(): void {
  const mod = ModuleRegistry.get('toolbox');
  if (mod) {
    mod.routes = [
      { path: '/toolbox', element: ToolboxPage },
    ];
  }
}
