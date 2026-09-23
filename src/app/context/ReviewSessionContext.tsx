import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { ReviewSession } from '../types/api';

interface ReviewSessionContextValue {
  activeSession: ReviewSession | null;
  setActiveSession: (session: ReviewSession) => void;
  clearActiveSession: () => void;
}

const ReviewSessionContext = createContext<ReviewSessionContextValue | undefined>(undefined);

function storageKey(type: string): string {
  return `uta-promo-active-review-session:${type}`;
}

function readStored(type: string | null): ReviewSession | null {
  if (!type) return null;
  const raw = window.sessionStorage.getItem(storageKey(type));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ReviewSession;
  } catch {
    return null;
  }
}

/**
 * Sesión de revisión activa (proceso + comisión + facultad) de CP o CA, recordada
 * dentro de la pestaña del navegador (sessionStorage) igual que el proceso seleccionado.
 * CP y CA tienen claves independientes para no pisarse si se prueban ambos roles a la vez.
 */
export function ReviewSessionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const type = user?.backendRole === 'cp' ? 'cp' : user?.backendRole === 'ca' ? 'ca' : null;

  const [activeSession, setActiveSessionState] = useState<ReviewSession | null>(() => readStored(type));

  useEffect(() => {
    setActiveSessionState(readStored(type));
  }, [type]);

  const setActiveSession = useCallback(
    (session: ReviewSession) => {
      if (!type) return;
      window.sessionStorage.setItem(storageKey(type), JSON.stringify(session));
      setActiveSessionState(session);
    },
    [type]
  );

  const clearActiveSession = useCallback(() => {
    if (!type) return;
    window.sessionStorage.removeItem(storageKey(type));
    setActiveSessionState(null);
  }, [type]);

  const value = useMemo<ReviewSessionContextValue>(
    () => ({ activeSession, setActiveSession, clearActiveSession }),
    [activeSession, setActiveSession, clearActiveSession]
  );

  return <ReviewSessionContext.Provider value={value}>{children}</ReviewSessionContext.Provider>;
}

export function useReviewSession() {
  const context = useContext(ReviewSessionContext);

  if (!context) {
    throw new Error('useReviewSession must be used within ReviewSessionProvider');
  }

  return context;
}
