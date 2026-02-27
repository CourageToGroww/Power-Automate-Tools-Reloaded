import React from 'react';
import { ExportActions } from '../../common/components/ExportActions';

export const GraphPage: React.FC = () => {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-xl md:text-2xl font-bold mb-2">Microsoft Graph</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
        Export data from Microsoft Graph API - users, groups, apps, mail, calendar, and more.
      </p>
      <ExportActions serviceType="graph" context={{}} />
    </div>
  );
};
