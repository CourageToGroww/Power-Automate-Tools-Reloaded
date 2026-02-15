import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Generate a simple UUID v4 (fallback for older browsers).
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface Script {
  id: string;
  name: string;
  description: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

interface ToolboxContextValue {
  scripts: Script[];
  loading: boolean;
  saveScript(script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Script>;
  deleteScript(id: string): Promise<void>;
  getScript(id: string): Promise<Script | undefined>;
}

const ToolboxContext = createContext<ToolboxContextValue>({
  scripts: [],
  loading: false,
  saveScript: async () => {
    throw new Error('ToolboxProvider not initialized');
  },
  deleteScript: async () => {
    throw new Error('ToolboxProvider not initialized');
  },
  getScript: async () => {
    throw new Error('ToolboxProvider not initialized');
  },
});

export const useToolbox = () => useContext(ToolboxContext);

const DB_NAME = 'm365-toolbox';
const STORE_NAME = 'scripts';
const DB_VERSION = 1;

/**
 * Open or create the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

/**
 * Load all scripts from IndexedDB.
 */
async function loadAllScripts(): Promise<Script[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as Script[]);
    };

    request.onerror = () => {
      reject(new Error('Failed to load scripts'));
    };
  });
}

/**
 * Save a script to IndexedDB.
 */
async function saveScriptToDb(script: Script): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(script);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save script'));
    };
  });
}

/**
 * Delete a script from IndexedDB.
 */
async function deleteScriptFromDb(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete script'));
    };
  });
}

/**
 * Get a single script by ID.
 */
async function getScriptFromDb(id: string): Promise<Script | undefined> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as Script | undefined);
    };

    request.onerror = () => {
      reject(new Error('Failed to get script'));
    };
  });
}

export const ToolboxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllScripts()
      .then((loadedScripts) => {
        setScripts(loadedScripts.sort((a, b) => b.updatedAt - a.updatedAt));
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load scripts:', error);
        setLoading(false);
      });
  }, []);

  const saveScript = useCallback(
    async (input: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Script> => {
      const now = Date.now();
      const isNew = !input.id;
      const scriptId = input.id || (crypto.randomUUID ? crypto.randomUUID() : generateUUID());

      const script: Script = {
        id: scriptId,
        name: input.name,
        description: input.description,
        code: input.code,
        createdAt: isNew ? now : (input.id ? (await getScriptFromDb(input.id))?.createdAt || now : now),
        updatedAt: now,
      };

      await saveScriptToDb(script);

      setScripts((prev) => {
        const filtered = prev.filter((s) => s.id !== script.id);
        return [script, ...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
      });

      return script;
    },
    []
  );

  const deleteScript = useCallback(async (id: string): Promise<void> => {
    await deleteScriptFromDb(id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const getScript = useCallback(async (id: string): Promise<Script | undefined> => {
    return getScriptFromDb(id);
  }, []);

  const value: ToolboxContextValue = {
    scripts,
    loading,
    saveScript,
    deleteScript,
    getScript,
  };

  return <ToolboxContext.Provider value={value}>{children}</ToolboxContext.Provider>;
};
