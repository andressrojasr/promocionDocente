import { useCallback, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { useReviewSession } from '../context/ReviewSessionContext';
import { navItems } from '../config/navigation';
import utaLogo from '../../assets/uta-logo.png';
import { BACKEND_ROLE_LABELS } from '../utils/format';
import { useTeacherProfile } from '../hooks/useTeacherProfile';
import { NotificationsBell } from './NotificationsBell';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import { closeReviewSession } from '../services/review-sessions-service';
import type { AuthUser } from '../context/AuthContext';
import type { ProcessSummary, ReviewSession } from '../types/api';

const SIDEBAR_CLOSE_DELAY_MS = 200;
// El sidebar permanece colapsado por defecto y se expande temporalmente al pasar el mouse.
const SIDEBAR_COLLAPSED_BY_DEFAULT = true;

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
  selectedProcess: ProcessSummary | null;
  activeSession: ReviewSession | null;
  onChangeProcess: () => void;
  onChangeSession: () => void;
  onCloseSession: () => void;
  closingSession: boolean;
}

function TopBar({
  user,
  onNavigate,
  onLogout,
  selectedProcess,
  activeSession,
  onChangeProcess,
  onChangeSession,
  onCloseSession,
  closingSession
}: TopBarProps) {
  const isTeacher = user?.rol === 'docente';
  const teacherProfile = useTeacherProfile(isTeacher);
  const showWorkContext =
    user?.rol === 'comision_promocion' || user?.rol === 'comision_apelaciones' || user?.rol === 'docente';

  return (
    <header className="bg-white border-b border-border px-6 py-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <img src={utaLogo} alt="Universidad Técnica de Ambato" className="h-11 w-auto flex-none" />
          <p className="hidden whitespace-nowrap border-l pl-4 text-sm font-medium sm:block">Promoción Docente</p>
        </div>

        {showWorkContext && (
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm min-w-0 max-w-full">
              <span className="text-gray-600 truncate">
                Proceso:{' '}
                <span className="font-semibold text-blue-900">
                  {selectedProcess ? selectedProcess.name : 'Sin proceso seleccionado'}
                </span>
              </span>
              <Button variant="ghost" size="sm" className="h-6 px-2 flex-shrink-0" onClick={onChangeProcess}>
                Cambiar
              </Button>
            </div>
            {activeSession && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg text-sm min-w-0 max-w-full">
                <span className="text-gray-600 truncate">
                  Sesión: <span className="font-semibold text-green-900">{activeSession.facultyName}</span>
                </span>
                <Button variant="ghost" size="sm" className="h-6 px-2 flex-shrink-0" onClick={onChangeSession}>
                  Cambiar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 flex-shrink-0 text-red-600 hover:text-red-700"
                  disabled={closingSession}
                  onClick={onCloseSession}
                >
                  {closingSession ? 'Cerrando...' : 'Cerrar'}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-4">
          <NotificationsBell />

          <div className="flex items-center gap-3">
            <div className="min-w-0 text-right">
              <p className="text-sm font-medium leading-tight">
                {isTeacher ? (teacherProfile?.profile.fullName ?? user?.nombre) : user?.nombre}
              </p>
              {isTeacher ? (
                teacherProfile && (
                  <>
                    <p className="text-xs text-muted-foreground leading-tight">
                      C.I. {teacherProfile.profile.identification} · {teacherProfile.currentPositionLabel}
                    </p>
                    <p
                      className="ml-auto max-w-[16rem] truncate text-xs text-muted-foreground leading-tight"
                      title={teacherProfile.profile.dependency?.name}
                    >
                      {teacherProfile.profile.dependency?.name}
                    </p>
                  </>
                )
              ) : (
                <>
                  <p className="text-xs text-muted-foreground leading-tight">
                    {user ? BACKEND_ROLE_LABELS[user.backendRole] : ''}
                  </p>
                  <p className="ml-auto max-w-[16rem] truncate text-xs text-muted-foreground leading-tight" title={user?.email}>
                    {user?.email}
                  </p>
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={onLogout} className="flex-none text-red-600 hover:text-red-700">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedProcess } = useSelectedProcess();
  const { activeSession, clearActiveSession } = useReviewSession();
  const [sidebarHoverOpen, setSidebarHoverOpen] = useState(false);
  const [closingSession, setClosingSession] = useState(false);
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

  const handleChangeProcess = useCallback(() => {
    navigate('/promociones');
  }, [navigate]);

  const handleChangeSession = useCallback(() => {
    navigate('/sesiones');
  }, [navigate]);

  const handleCloseSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      setClosingSession(true);
      await closeReviewSession(activeSession.id);
      clearActiveSession();
      toast.success('Sesión cerrada. Ya no podrá usarse para decidir postulaciones.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      setClosingSession(false);
    }
  }, [activeSession, clearActiveSession]);

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
        <TopBar
          user={user}
          onNavigate={navigate}
          onLogout={handleLogout}
          selectedProcess={selectedProcess}
          activeSession={activeSession}
          onChangeProcess={handleChangeProcess}
          onChangeSession={handleChangeSession}
          onCloseSession={() => void handleCloseSession()}
          closingSession={closingSession}
        />

        <main className="flex-1 overflow-auto p-6 bg-[#F5F5F5]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
