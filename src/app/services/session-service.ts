import { httpClient } from './http-client';
import type { BackendRole, SessionData, SessionUser } from '../types/api';
import type { UserRole } from '../context/AuthContext';

/**
 * Intercambio de sesión con el backend de promoción: envía el token externo de la
 * UTA y recibe el JWT propio de la aplicación junto con el usuario y su rol.
 */
export function exchangeSession(externalAccessToken: string): Promise<SessionData> {
  return httpClient.post<SessionData>('/api/v1/auth/session', { externalAccessToken });
}

export function fetchMe(): Promise<SessionUser> {
  return httpClient.get<SessionUser>('/api/v1/auth/me');
}

/** Mapeo entre los roles del backend y los roles internos del frontend. */
const BACKEND_ROLE_MAP: Record<BackendRole, UserRole> = {
  admin: 'admin',
  cp: 'comision_academica',
  th: 'talento_humano',
  ca: 'comision_apelaciones',
  teacher: 'docente'
};

export function mapBackendRole(role: BackendRole): UserRole {
  return BACKEND_ROLE_MAP[role] ?? 'docente';
}
