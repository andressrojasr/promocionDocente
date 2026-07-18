// URL base del servicio de autenticación de la UTA (backend simulado).
// El login es la única llamada que va directo a la simulación; el resto de
// operaciones pasa por el backend de promoción (ver http-client.ts).
const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL ?? 'http://localhost:5031';

export interface LoginTokens {
  accessToken: string;
  refreshToken: string;
}

interface LoginApiResponse {
  success: boolean;
  data: LoginTokens | null;
  message: string;
  errors: unknown;
  timestamp: string;
}

/**
 * Claims relevantes decodificados desde un token JWT.
 */
export interface JwtClaims {
  sub: string;
  email: string;
  exp: number;
}

/**
 * Decodifica el payload de un JWT (parte central) sin validar la firma.
 * Se usa únicamente para verificar la expiración de la sesión almacenada;
 * la validación real de la firma es responsabilidad de los backends.
 */
export function decodeJwt(token: string): JwtClaims {
  const payload = token.split('.')[1];
  if (!payload) {
    throw new Error('Token JWT inválido');
  }

  // Convertir de base64url a base64 estándar.
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = decodeURIComponent(
    atob(base64)
      .split('')
      .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );

  const claims = JSON.parse(json) as Record<string, unknown>;

  return {
    sub: String(claims.sub ?? ''),
    email: String(claims.email ?? ''),
    exp: Number(claims.exp ?? 0)
  };
}

/**
 * Llama al servicio de login de la UTA y devuelve los tokens externos.
 * Lanza un Error con el mensaje del servicio si las credenciales son inválidas.
 */
export async function loginRequest(email: string, password: string): Promise<LoginTokens> {
  let response: Response;

  try {
    response = await fetch(`${AUTH_API_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({ email, password })
    });
  } catch {
    throw new Error('No se pudo conectar con el servicio de autenticación. Verifique su conexión.');
  }

  let body: LoginApiResponse | null = null;
  try {
    body = (await response.json()) as LoginApiResponse;
  } catch {
    body = null;
  }

  if (!response.ok || !body?.success || !body.data) {
    throw new Error(body?.message ?? 'Credenciales inválidas. Por favor, intente nuevamente.');
  }

  return body.data;
}
