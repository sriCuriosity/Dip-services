import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import { db } from '@/src/lib/firebase';
import { WorkerProfile } from '@/src/types';
import {
  dedupeWorkersByTrade,
  expandWorkerEntries,
} from '@/src/lib/workerDirectory';
import { readWorkerDirectoryCache, writeWorkerDirectoryCache } from '@/src/lib/workerDirectoryCache';
import { useAuth } from '@/src/contexts/AuthContext';

type WorkerDirectoryContextValue = {
  workers: WorkerProfile[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

const WorkerDirectoryContext = createContext<WorkerDirectoryContextValue | null>(null);

export const WorkerDirectoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const isUser = profile?.role?.toLowerCase() === 'user';
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const applyWorkers = useCallback((list: WorkerProfile[]) => {
    if (list.length > 0) hasDataRef.current = true;
    setWorkers(list);
    setLoading(false);
    writeWorkerDirectoryCache(list);
  }, []);

  useEffect(() => {
    if (!profile?.uid || !isUser) {
      setWorkers([]);
      setLoading(false);
      hasDataRef.current = false;
      setError(null);
      return;
    }

    const cached = readWorkerDirectoryCache();
    if (cached?.workers?.length) {
      hasDataRef.current = true;
      setWorkers(cached.workers);
      setLoading(false);
    } else {
      setLoading(true);
    }

    setError(null);
    const workersRef = ref(db, 'workers');
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = onValue(
      workersRef,
      (snapshot) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          const raw = (snapshot.val() || {}) as Record<string, unknown>;
          const expanded = dedupeWorkersByTrade(expandWorkerEntries(raw));
          applyWorkers(expanded);
        }, 200);
      },
      (err) => {
        console.error('WorkerDirectory onValue failed:', err);
        setError('Failed to load workers');
        setLoading(false);
      }
    );

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsubscribe();
    };
  }, [profile?.uid, isUser, applyWorkers]);

  const value: WorkerDirectoryContextValue = {
    workers,
    loading,
    error,
    refresh: () => {
      /* onValue keeps data live; cache refresh happens on next snapshot */
      if (!hasDataRef.current) setLoading(true);
    },
  };

  return <WorkerDirectoryContext.Provider value={value}>{children}</WorkerDirectoryContext.Provider>;
};

export function useWorkerDirectoryContext(): WorkerDirectoryContextValue {
  const ctx = useContext(WorkerDirectoryContext);
  if (!ctx) {
    throw new Error('useWorkerDirectoryContext must be used within WorkerDirectoryProvider');
  }
  return ctx;
}

export function useWorkerDirectory(_enabled = true) {
  const ctx = useWorkerDirectoryContext();
  return {
    workers: ctx.workers,
    users: {} as Record<string, unknown>,
    loading: ctx.loading,
    error: ctx.error,
    refresh: ctx.refresh,
  };
}
