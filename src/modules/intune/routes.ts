/**
 * Frontend-only: registers React component routes for the Intune module.
 * Must be imported ONLY from app.tsx (not from background.ts).
 */
import { ModuleRegistry } from '../../core/modules/ModuleRegistry';
import { DevicesPage } from './pages/DevicesPage';
import { PoliciesPage } from './pages/PoliciesPage';

export function registerIntuneRoutes(): void {
  const mod = ModuleRegistry.get('intune');
  if (mod) {
    mod.routes = [
      { path: '/intune', element: DevicesPage },
      { path: '/intune/policies', element: PoliciesPage },
    ];
  }
}
