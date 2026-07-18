import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { decodeJwt, loginRequest } from '../services/auth-service';
import { exchangeSession, mapBackendRole } from '../services/session-service';
import { SESSION_EXPIRED_EVENT, setTokenProvider } from '../services/http-client';
import type { BackendRole } from '../types/api';

export type UserRole =
  | 'admin'
  | 'comision_academica'
  | 'docente'
  | 'talento_humano'
  | 'comision_apelaciones';

export interface AuthUser {
  userId: string;
  nombre: string;
  email: string;
  rol: UserRole;
  backendRole: BackendRole;
  teacherId: string | null;
  currentPosition: string | null;
}

interface AuthSession {
  user: AuthUser;
  /** JWT propio del backend de promoción; se envía en todas las llamadas al API. */
  appToken: string;
  /** Token del servicio de la UTA, usado solo durante el intercambio de sesión. */
  externalAccessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const SESSION_STORAGE_KEY = 'uta-promo-session';

function readStoredSession(): AuthSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthSession;
    const { exp } = decodeJwt(session.appToken);

    if (exp * 1000 <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

// El http-client obtiene el token vigente directamente del almacenamiento,
// de modo que funciona incluso antes de montar el AuthProvider.
setTokenProvider(() => readStoredSession()?.appToken ?? null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());

  const login = useCallback(async (email: string, password: string) => {
    // Paso 1: autenticación contra el servicio de la UTA (backend simulado).
    const tokens = await loginRequest(email, password);

    // Paso 2: intercambio de sesión con el backend de promoción, que sincroniza
    // el usuario y su hoja de vida, y devuelve el rol registrado en la base de datos.
    const sessionData = await exchangeSession(tokens.accessToken);

    const nextSession: AuthSession = {
      user: {
        userId: sessionData.user.id,
        nombre: sessionData.user.fullName,
        email: sessionData.user.email,
        rol: mapBackendRole(sessionData.user.role),
        backendRole: sessionData.user.role,
        teacherId: sessionData.user.teacherId,
        currentPosition: sessionData.user.currentPosition
      },
      appToken: sessionData.accessToken,
      externalAccessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    };

    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setSession(null);
  }, []);

  // El http-client dispara este evento cuando el backend responde 401.
  useEffect(() => {
    const handleSessionExpired = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [logout]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.appToken ?? null,
      isAuthenticated: session !== null,
      login,
      logout
    }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
