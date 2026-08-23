import type { ApiResponse } from '../types/api';

/**
 * Cliente HTTP hacia el backend de promoción docente.
 * Inyecta el token propio de la aplicación, desenvuelve el envelope ApiResponse
 * y dispara un evento global de sesión expirada ante un 401.
 */

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5080';

/** Evento global que AuthContext escucha para cerrar sesión ante un token inválido. */
export const SESSION_EXPIRED_EVENT = 'app:session-expired';

type TokenProvider = () => string | null;

let tokenProvider: TokenProvider = () => null;

/** AuthContext registra aquí cómo obtener el token vigente. */
export function setTokenProvider(provider: TokenProvider) {
  tokenProvider = provider;
}

export class ApiError extends Error {
  readonly status: number;
  readonly errors: unknown;

  constructor(message: string, status: number, errors: unknown = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

async function request<T>(method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', ...extraHeaders };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const token = tokenProvider();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifique su conexión.', 0);
  }

  if (response.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError('Su sesión ha expirado. Inicie sesión nuevamente.', 401);
  }

  let envelope: ApiResponse<T> | null = null;
  try {
    envelope = (await response.json()) as ApiResponse<T>;
  } catch {
    envelope = null;
  }

  if (!response.ok || !envelope?.success) {
    throw new ApiError(
      envelope?.message ?? `Error del servidor (${response.status}).`,
      response.status,
      envelope?.errors ?? null
    );
  }

  return envelope.data as T;
}

export const httpClient = {
  get: <T>(path: string, extraHeaders?: Record<string, string>) => request<T>('GET', path, undefined, extraHeaders),
  post: <T>(path: string, body?: unknown, extraHeaders?: Record<string, string>) => request<T>('POST', path, body, extraHeaders),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body)
};
