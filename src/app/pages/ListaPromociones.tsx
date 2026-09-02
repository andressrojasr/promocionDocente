import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, CalendarDays, Users, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ProcessStatusBadge } from '../components/ApplicationStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { fetchProcesses } from '../services/processes-service';
import { fetchApplications } from '../services/applications-service';
import { formatDate } from '../utils/format';
import type { ProcessSummary, ApplicationSummary } from '../types/api';

export default function ListaPromociones() {
  const { user } = useAuth();
  const { setSelectedProcess } = useSelectedProcess();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const isCp = user?.backendRole === 'cp';
  const isTeacher = user?.backendRole === 'teacher';
  const isTH = user?.backendRole === 'th';
  const isCa = user?.backendRole === 'ca';

  const handleProcessClick = async (process: ProcessSummary) => {
    setSelectedProcess(process);
    if (isTH) {
      navigate('/postulaciones');
    } else if (isCp) {
      navigate('/dashboard');
    } else if (isCa) {
      navigate('/apelaciones');
    } else if (isTeacher) {
      // Si docente ya postuló, ir a su postulación; si no, ir a requisitos del proceso
      if (process.hasApplied) {
        try {
          const applications = await fetchApplications(undefined, process.id);
          const myApplication = applications.find(app => app.teacherUserId === user?.userId);
          if (myApplication) {
            navigate(`/postulaciones/${myApplication.id}`);
          } else {
            navigate(`/promociones/${process.id}`);
          }
        } catch (error) {
          console.error('Error fetching applications:', error);
          navigate(`/promociones/${process.id}`);
        }
      } else {
        navigate(`/promociones/${process.id}`);
      }
    } else {
      navigate(`/promociones/${process.id}`);
    }
  };

  useEffect(() => {
    fetchProcesses()
      .then(setProcesses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los procesos.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Procesos de Promoción</h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? 'Seleccione un proceso para revisar los requisitos y realizar su postulación.'
              : 'Procesos de promoción docente registrados en el sistema.'}
          </p>
        </div>
        {isCp && (
          <Button onClick={() => navigate('/promociones/crear')} className="bg-[#00345E]">
            <Plus className="mr-2 h-4 w-4" />
            Crear proceso
          </Button>
        )}
      </div>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Cargando procesos...</p>
      ) : processes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aún no existen procesos de promoción.
            {isCp && ' Cree el primero con el botón "Crear proceso".'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {processes.map((process) => (
            <Card
              key={process.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => void handleProcessClick(process)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{process.name}</CardTitle>
                  <ProcessStatusBadge status={process.status} />
                </div>
                {process.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{process.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {formatDate(process.startDate)} — {formatDate(process.endDate)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{process.applicationsCount} postulaciones</span>
                </div>
                {isTeacher && process.myTransition && (
                  <div className="pt-1">
                    <Badge variant="secondary">
                      Su transición: {process.myTransition.fromLabel} → {process.myTransition.toLabel}
                    </Badge>
                  </div>
                )}
                {isTeacher && process.hasApplied && (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ya postuló</Badge>
                )}
                {isCp && (
                  <div className="pt-4">
                    <Button
                      className="w-full bg-[#00345E] hover:bg-[#002c4d]"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProcess(process);
                        navigate('/dashboard');
                      }}
                    >
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Dashboard
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
