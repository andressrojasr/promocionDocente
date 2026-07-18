import type { ReactNode } from 'react';
import { Home, Users, FileText, CheckSquare, MessageSquare } from 'lucide-react';
import type { UserRole } from '../context/AuthContext';

export interface NavItem {
  label: string;
  icon: ReactNode;
  path: string;
  roles: UserRole[];
}

/**
 * Fuente única de verdad para la navegación por rol.
 * Se usa tanto para renderizar el menú lateral (AppLayout) como para
 * proteger las rutas correspondientes (routes.tsx).
 */
export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    icon: <Home className="w-5 h-5" />,
    path: '/dashboard',
    roles: ['admin', 'comision_academica', 'docente', 'talento_humano', 'comision_apelaciones']
  },
  {
    label: 'Gestión de Usuarios',
    icon: <Users className="w-5 h-5" />,
    path: '/usuarios',
    roles: ['admin']
  },
  {
    label: 'Promociones',
    icon: <FileText className="w-5 h-5" />,
    path: '/promociones',
    roles: ['comision_academica', 'docente', 'talento_humano']
  },
  {
    label: 'Postulaciones',
    icon: <CheckSquare className="w-5 h-5" />,
    path: '/postulaciones',
    roles: ['comision_academica', 'docente', 'talento_humano']
  },
  {
    label: 'Apelaciones',
    icon: <MessageSquare className="w-5 h-5" />,
    path: '/apelaciones',
    roles: ['docente', 'comision_apelaciones']
  }
];

export function rolesForPath(path: string): UserRole[] | null {
  const item = navItems.find((candidate) => path === candidate.path || path.startsWith(`${candidate.path}/`));
  return item?.roles ?? null;
}
