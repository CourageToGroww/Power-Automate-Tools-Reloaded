import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { RelayToggle } from '../../components/RelayToggle';
import { cn } from '../../lib/utils';
import { Activity, Globe, Database, Monitor, FileText } from 'lucide-react';
import { ModuleRegistry } from '../modules/ModuleRegistry';

/** Map of icon names to Lucide components */
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  Globe,
  Database,
  Monitor,
  FileText,
};

/**
 * Builds the navigation bar dynamically from all registered modules.
 * Shows module name + icon as the header when only one module is registered.
 * Shows a service selector when multiple modules are registered.
 */
export const DynamicNavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const modules = ModuleRegistry.getAll();

  // For Phase 1, we only have one module so show its tabs directly
  // When multiple modules exist, this can be extended with a module selector
  const allNavItems = modules.flatMap((mod) =>
    mod.navItems.map((item) => ({
      ...item,
      moduleId: mod.id,
      moduleName: mod.name,
      moduleIcon: mod.icon,
    }))
  );

  // Determine current active tab
  const currentPath = location.pathname;
  const activeItem = allNavItems.find((item) => {
    if (item.path === '/') return currentPath === '/';
    return currentPath.startsWith(item.path);
  }) || allNavItems[0];

  // Get the header info from first (or only) module
  const primaryModule = modules[0];
  const HeaderIcon = primaryModule
    ? iconMap[primaryModule.icon] || Activity
    : Activity;
  const headerText = primaryModule?.name || 'M365 Workbench';

  return (
    <div className="h-12 bg-background border-b dark:bg-gray-900 dark:border-gray-800">
      <div className="h-full flex items-center px-4">
        <div className="flex items-center gap-2 font-semibold text-base">
          <HeaderIcon className="w-5 h-5" />
          <span>{headerText}</span>
        </div>
        <div className="ml-8 flex gap-1">
          {allNavItems.map((item) => (
            <Button
              key={`${item.moduleId}-${item.id}`}
              variant="ghost"
              size="sm"
              onClick={() => navigate(item.path)}
              className={cn(
                'rounded-none border-b-2 border-transparent',
                activeItem?.id === item.id &&
                  activeItem?.moduleId === item.moduleId &&
                  'border-primary font-medium'
              )}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex items-center">
          <RelayToggle />
        </div>
      </div>
    </div>
  );
};
