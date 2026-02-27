import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { Activity, Globe, HardDrive, FileText, Layers, PanelLeft, Network } from 'lucide-react';
import { RelayToggle } from '../../components/RelayToggle';
import { useMultiServiceApi } from '../providers/MultiServiceApiProvider';
import { useDataSources } from '../../contexts/DataSourceContext';

interface NavTab {
  id: string;
  label: string;
  path: string;
  service?: string;
  icon?: React.ReactNode;
}

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { serviceStatus } = useMultiServiceApi();
  const { sidebarCollapsed, toggleSidebar, sources } = useDataSources();

  const tabs: NavTab[] = [
    { id: 'editor', label: 'Flow Editor', path: '/', service: 'power-automate' },
    { id: 'failures', label: 'Previous Runs', path: '/failures', service: 'power-automate' },
    { id: 'sharepoint', label: 'SharePoint', path: '/sharepoint', service: 'sharepoint', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'intune', label: 'Intune', path: '/intune', service: 'intune', icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'forms', label: 'Forms', path: '/forms', service: 'forms', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'graph', label: 'Graph', path: '/graph', service: 'graph', icon: <Network className="w-3.5 h-3.5" /> },
  ];

  const currentPath = location.pathname;

  function isActive(tab: NavTab): boolean {
    if (tab.path === '/') return currentPath === '/';
    return currentPath.startsWith(tab.path);
  }

  function hasToken(service?: string): boolean {
    if (!service) return false;
    return Boolean(serviceStatus[service]?.hasToken);
  }

  return (
    <div className="h-12 bg-background border-b dark:bg-gray-900 dark:border-gray-800">
      <div className="h-full flex items-center px-2 sm:px-4">
        {sidebarCollapsed && sources.length > 0 && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-muted rounded transition-colors mr-2"
            title="Show data sources"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-center gap-2 font-semibold text-sm sm:text-base shrink-0">
          <Layers className="w-5 h-5" />
          <span className="hidden md:inline">M365 Workbench</span>
          <span className="md:hidden">M365</span>
        </div>

        <div className="ml-4 sm:ml-8 flex gap-0.5 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => navigate(tab.path)}
              className={cn(
                "rounded-none border-b-2 border-transparent whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3",
                isActive(tab) && "border-primary font-medium"
              )}
            >
              <span className="flex items-center gap-1.5">
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                {tab.service && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      hasToken(tab.service) ? "bg-green-500" : "bg-gray-400"
                    )}
                  />
                )}
              </span>
            </Button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2 shrink-0">
          <RelayToggle />
        </div>
      </div>
    </div>
  );
};
