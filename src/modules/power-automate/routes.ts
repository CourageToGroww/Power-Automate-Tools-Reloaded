/**
 * Frontend-only: registers React component routes for the PA module.
 * Must be imported ONLY from app.tsx (not from background.ts).
 */
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { FlowEditorPage } from '../../features/flow-editor/FlowEditorPage';
import { PreviousRunsPage } from '../../features/previous-runs/PreviousRunsPage';

export function registerPARoutes(): void {
  const mod = ModuleRegistry.get('power-automate');
  if (mod) {
    mod.routes = [
      { path: '/', element: FlowEditorPage, index: true },
      { path: '/failures', element: PreviousRunsPage },
    ];
  }
}
