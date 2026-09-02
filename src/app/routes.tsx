import { createBrowserRouter, Navigate } from 'react-router';
import { useAuth } from './context/AuthContext';
import { useSelectedProcess } from './context/ProcessContext';
import { navItems } from './config/navigation';
import { RequireAuth, RequireRole } from './routes/RouteGuards';
import { AppLayout } from './components/AppLayout';
import Login from './pages/Login';
import ProcessSelection from './pages/ProcessSelection';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardComisionAcademica from './pages/DashboardComisionAcademica';
import DashboardDocente from './pages/DashboardDocente';
import DashboardCPIntegrated from './pages/DashboardCPIntegrated';
import GestionUsuarios from './pages/GestionUsuarios';
import ListaPromociones from './pages/ListaPromociones';
import DetallePromocion from './pages/DetallePromocion';
import FormularioPostulacion from './pages/FormularioPostulacion';
import RevisionPostulacion from './pages/RevisionPostulacion';
import CrearPromocion from './pages/CrearPromocion';
import ListaPostulaciones from './pages/ListaPostulaciones';
import GestionApelaciones from './pages/GestionApelaciones';
import VerificarElegibilidad from './pages/VerificarElegibilidad';
import PerfilDocente from './pages/PerfilDocente';

const rolesFor = (path: string) => navItems.find((item) => item.path === path)!.roles;

function DashboardRouter() {
  const { user } = useAuth();
  const { selectedProcess } = useSelectedProcess();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Los docentes y TH van a promociones primero para seleccionar el proceso
  if (user.rol === 'docente' || user.rol === 'talento_humano') {
    return <Navigate to="/promociones" replace />;
  }

  // CP y CA sin proceso seleccionado van a promociones
  if ((user.rol === 'comision_promocion' || user.rol === 'comision_apelaciones') && !selectedProcess) {
    return <Navigate to="/promociones" replace />;
  }

  // Si no hay proceso seleccionado y necesita uno, redirige a selección
  if (!selectedProcess && user.rol !== 'admin') {
    return <Navigate to="/process-selection" replace />;
  }

  switch (user.rol) {
    case 'admin':
      return <DashboardAdmin />;
    case 'comision_academica':
      return <DashboardComisionAcademica />;
    case 'comision_promocion':
      return <DashboardCPIntegrated />;
    case 'comision_apelaciones':
      return <DashboardComisionAcademica />;
    default:
      return <Navigate to="/login" replace />;
  }
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />
      },
      {
        path: 'process-selection',
        element: <ProcessSelection />
      },
      {
        path: 'dashboard',
        element: <DashboardRouter />
      },
      {
        path: 'usuarios',
        element: (
          <RequireRole roles={rolesFor('/usuarios')}>
            <GestionUsuarios />
          </RequireRole>
        )
      },
      {
        path: 'promociones',
        element: (
          <RequireRole roles={rolesFor('/promociones')}>
            <ListaPromociones />
          </RequireRole>
        )
      },
      {
        path: 'promociones/:id',
        element: (
          <RequireRole roles={rolesFor('/promociones')}>
            <DetallePromocion />
          </RequireRole>
        )
      },
      {
        path: 'promociones/:id/postular',
        element: (
          <RequireRole roles={rolesFor('/promociones')}>
            <FormularioPostulacion />
          </RequireRole>
        )
      },
      {
        path: 'promociones/crear',
        element: (
          <RequireRole roles={rolesFor('/promociones')}>
            <CrearPromocion />
          </RequireRole>
        )
      },
      {
        path: 'postulaciones',
        element: (
          <RequireRole roles={rolesFor('/postulaciones')}>
            <ListaPostulaciones />
          </RequireRole>
        )
      },
      {
        path: 'postulaciones/:id',
        element: (
          // La Comisión de Apelaciones también accede al detalle (desde su lista de apelaciones).
          <RequireRole roles={[...rolesFor('/postulaciones'), 'comision_apelaciones']}>
            <RevisionPostulacion />
          </RequireRole>
        )
      },
      {
        path: 'apelaciones',
        element: (
          <RequireRole roles={rolesFor('/apelaciones')}>
            <GestionApelaciones />
          </RequireRole>
        )
      },
      {
        path: 'elegibilidad',
        element: <VerificarElegibilidad />
      },
      {
        path: 'perfil',
        element: <PerfilDocente />
      },
      {
        path: 'configuracion',
        element: <div className="p-6">Configuración (En construcción)</div>
      }
    ]
  },
  {
    path: '*',
    element: <Navigate to="/" replace />
  }
]);
