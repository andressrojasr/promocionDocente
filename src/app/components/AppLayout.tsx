import { useCallback, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { navItems } from '../config/navigation';
import { NotificationsBell } from './NotificationsBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from './ui/utils';
import type { AuthUser } from '../context/AuthContext';

const SIDEBAR_CLOSE_DELAY_MS = 200;
// El sidebar permanece colapsado por defecto y se expande temporalmente al pasar el mouse.
const SIDEBAR_COLLAPSED_BY_DEFAULT = true;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

interface SidebarProps {
  collapsed: boolean;
  currentPath: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onNavigate: (path: string) => void;
  items: typeof navItems;
}

function Sidebar({ collapsed, currentPath, onMouseEnter, onMouseLeave, onNavigate, items }: SidebarProps) {
  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'bg-[#00345E] text-white flex flex-col transition-all duration-200 ease-in-out overflow-hidden',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="p-4 border-b border-white/10">
        <div className="relative h-10 flex items-center">
          <div
            className={cn(
              'transition-all duration-200 ease-in-out origin-left',
              collapsed ? 'opacity-0 max-w-0 overflow-hidden' : 'opacity-100 max-w-full'
            )}
          >
            <h1 className="font-semibold text-lg">UTA</h1>
            <p className="text-xs text-white/70">Promoción Docente</p>
          </div>
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center transition-all duration-200 ease-in-out',
              collapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <h1 className="font-semibold text-lg mx-auto">UTA</h1>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors overflow-hidden',
              'hover:bg-white/10',
              currentPath.startsWith(item.path) && 'bg-[#C9982E]'
            )}
          >
            <span className="flex-none text-white">{item.icon}</span>
            <span
              className={cn(
                'ml-2 overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out',
                collapsed ? 'opacity-0 -translate-x-2 max-w-0' : 'opacity-100 translate-x-0 max-w-full'
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

interface TopBarProps {
  user: AuthUser | null;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

function TopBar({ user, onNavigate, onLogout }: TopBarProps) {
  return (
    <header className="bg-white border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl">Universidad Técnica de Ambato</h2>
          <p className="text-sm text-muted-foreground">Promoción Docente</p>
        </div>

        <div className="flex items-center gap-4">
          <NotificationsBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 hover:bg-secondary px-3 py-2 rounded-lg transition-colors">
                <Avatar>
                  <AvatarFallback className="bg-accent text-white">
                    {user && getInitials(user.nombre)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm">{user?.nombre}</p>
                  <p className="text-xs text-muted-foreground">{user?.rol.replace('_', ' ')}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuItem onClick={onLogout} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarHoverOpen, setSidebarHoverOpen] = useState(false);
  const hoverTimeoutRef = useRef<number | undefined>(undefined);

  const visibleNavItems = navItems.filter((item) => user && item.roles.includes(user.rol));
  const effectiveCollapsed = SIDEBAR_COLLAPSED_BY_DEFAULT && !sidebarHoverOpen;

  const handleMouseEnter = useCallback(() => {
    window.clearTimeout(hoverTimeoutRef.current);
    setSidebarHoverOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = window.setTimeout(() => setSidebarHoverOpen(false), SIDEBAR_CLOSE_DELAY_MS);
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        collapsed={effectiveCollapsed}
        currentPath={location.pathname}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onNavigate={navigate}
        items={visibleNavItems}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar user={user} onNavigate={navigate} onLogout={handleLogout} />

        <main className="flex-1 overflow-auto p-6 bg-[#F5F5F5]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
