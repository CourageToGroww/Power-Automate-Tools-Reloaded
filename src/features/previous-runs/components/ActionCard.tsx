import React from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { FlowRunAction } from '../types';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  PlayCircle,
  Activity,
  Database,
  Mail,
  FileText,
  Globe,
  Zap,
  GitBranch,
  Settings
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface ActionCardProps {
  action: FlowRunAction & { id: string };
  isSelected: boolean;
  onClick: () => void;
  isTrigger?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  isSelected,
  onClick,
  isTrigger = false,
}) => {
  const getStatusIcon = () => {
    switch (action.status) {
      case 'Succeeded':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'Skipped':
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
      case 'Running':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <Activity className="w-5 h-5 text-gray-400" />;
    }
  };

  const getActionIcon = () => {
    const type = action.type?.toLowerCase() || '';
    
    if (isTrigger) return <PlayCircle className="w-5 h-5" />;
    if (type.includes('http')) return <Globe className="w-5 h-5" />;
    if (type.includes('email') || type.includes('mail')) return <Mail className="w-5 h-5" />;
    if (type.includes('file') || type.includes('document')) return <FileText className="w-5 h-5" />;
    if (type.includes('database') || type.includes('sql')) return <Database className="w-5 h-5" />;
    if (type.includes('condition') || type.includes('if')) return <GitBranch className="w-5 h-5" />;
    if (type.includes('variable') || type.includes('compose')) return <Settings className="w-5 h-5" />;
    
    return <Zap className="w-5 h-5" />;
  };

  const getDuration = () => {
    if (!action.startTime || !action.endTime) return null;
    const duration = new Date(action.endTime).getTime() - new Date(action.startTime).getTime();
    return `${(duration / 1000).toFixed(2)}s`;
  };

  const getStatusColor = () => {
    switch (action.status) {
      case 'Succeeded':
        return 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 hover:border-green-300 dark:hover:border-green-700';
      case 'Failed':
        return 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 hover:border-red-300 dark:hover:border-red-700';
      case 'Skipped':
        return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600';
      case 'Running':
        return 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 hover:border-yellow-300 dark:hover:border-yellow-700';
      default:
        return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600';
    }
  };

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all',
        getStatusColor(),
        isSelected && 'ring-2 ring-primary ring-offset-2',
        'hover:shadow-md'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className={cn(
              'p-2 rounded-lg',
              isTrigger ? 'bg-primary/10 text-primary' : 'bg-secondary/50'
            )}>
              {getActionIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{action.name}</h3>
                {isTrigger && (
                  <Badge variant="outline" className="text-xs">
                    Trigger
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {action.type || 'Unknown Action'}
              </p>
              {action.error && (
                <p className="text-xs text-destructive mt-2">
                  {action.error.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end space-y-2">
            {getStatusIcon()}
            {getDuration() && (
              <span className="text-xs text-muted-foreground">{getDuration()}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};