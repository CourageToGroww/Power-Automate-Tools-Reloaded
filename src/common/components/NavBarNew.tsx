import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { cn } from '../../lib/utils';
import { Activity } from 'lucide-react';

export const NavBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = location.pathname === '/failures' ? 'failures' : 
                    location.pathname === '/ai-assistance' ? 'ai-assistance' : 'editor';

  const tabs = [
    { id: 'editor', label: 'Flow Editor', path: '/' },
    { id: 'failures', label: 'Previous Runs', path: '/failures' },
    { id: 'ai-assistance', label: 'AI Assistance', path: '/ai-assistance' },
  ];

  return (
    <div className="h-12 bg-background border-b dark:bg-gray-900 dark:border-gray-800">
      <div className="h-full flex items-center px-4">
        <div className="flex items-center gap-2 font-semibold text-base">
          <Activity className="w-5 h-5" />
          <span>Power Automate Tools</span>
        </div>
        <div className="ml-8 flex gap-1">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              variant="ghost"
              size="sm"
              onClick={() => navigate(tab.path)}
              className={cn(
                "rounded-none border-b-2 border-transparent",
                currentTab === tab.id && "border-primary font-medium"
              )}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};