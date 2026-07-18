import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth, type UserRole } from '../context/AuthContext';

/**
 * Redirige a /login cuando no hay sesión activa, conservando la ruta de
 * origen en el state para poder volver a ella después de iniciar sesión.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

/**
 * Además de exigir sesión activa, restringe el acceso a los roles indicados.
 * Un usuario autenticado sin el rol requerido es enviado al dashboard.
 */
export function RequireRole({ roles, children }: { roles: UserRole[]; children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!roles.includes(user.rol)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
