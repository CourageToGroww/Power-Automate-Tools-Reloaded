/**
 * Frontend-only: registers React component routes for the Graph module.
 * Must be imported ONLY from app.tsx (not from background.ts).
 */
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { GraphExplorerPage } from './pages/GraphExplorerPage';

export function registerGraphRoutes(): void {
  const mod = ModuleRegistry.get('graph');
  if (mod) {
    mod.routes = [
      { path: '/graph', element: GraphExplorerPage },
    ];
  }
}
