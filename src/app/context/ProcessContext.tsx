import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { useReviewSession } from './ReviewSessionContext';
import type { ProcessSummary } from '../types/api';

interface ProcessContextValue {
  selectedProcess: ProcessSummary | null;
  setSelectedProcess: (process: ProcessSummary) => void;
  clearSelectedProcess: () => void;
}

const ProcessContext = createContext<ProcessContextValue | undefined>(undefined);

const PROCESS_STORAGE_KEY = 'uta-promo-selected-process';

function readStoredProcess(): ProcessSummary | null {
  const raw = window.sessionStorage.getItem(PROCESS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ProcessSummary;
  } catch {
    return null;
  }
}

export function ProcessProvider({ children }: { children: ReactNode }) {
  const { clearActiveSession } = useReviewSession();
  const [selectedProcess, setSelectedProcessState] = useState<ProcessSummary | null>(() =>
    readStoredProcess()
  );

  const setSelectedProcess = useCallback((process: ProcessSummary) => {
    window.sessionStorage.setItem(PROCESS_STORAGE_KEY, JSON.stringify(process));
    setSelectedProcessState((prev) => {
      // Una sesión de revisión activa pertenece a un proceso puntual: si se cambia de
      // proceso, esa sesión deja de ser válida y no debe seguir arrastrándose.
      if (prev && prev.id !== process.id) {
        clearActiveSession();
      }
      return process;
    });
  }, [clearActiveSession]);

  const clearSelectedProcess = useCallback(() => {
    window.sessionStorage.removeItem(PROCESS_STORAGE_KEY);
    setSelectedProcessState(null);
  }, []);

  const value = useMemo<ProcessContextValue>(
    () => ({
      selectedProcess,
      setSelectedProcess,
      clearSelectedProcess
    }),
    [selectedProcess, setSelectedProcess, clearSelectedProcess]
  );

  return <ProcessContext.Provider value={value}>{children}</ProcessContext.Provider>;
}

export function useSelectedProcess() {
  const context = useContext(ProcessContext);

  if (!context) {
    throw new Error('useSelectedProcess must be used within ProcessProvider');
  }

  return context;
}
