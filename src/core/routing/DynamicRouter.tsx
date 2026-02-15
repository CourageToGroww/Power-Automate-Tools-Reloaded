import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ModuleRegistry } from '../modules/ModuleRegistry';

/**
 * Builds React Router routes dynamically from all registered modules.
 * Each module contributes its own routes, rendered under the root path.
 */
export const DynamicRouter: React.FC = () => {
  const modules = ModuleRegistry.getAll();

  return (
    <Routes>
      <Route path="/">
        {modules.flatMap((mod) =>
          mod.routes.map((route) => {
            const Element = route.element;
            return route.index ? (
              <Route key={`${mod.id}-index`} index element={<Element />} />
            ) : (
              <Route
                key={`${mod.id}-${route.path}`}
                path={route.path.replace(/^\//, '')}
                element={<Element />}
              />
            );
          })
        )}
      </Route>
    </Routes>
  );
};
