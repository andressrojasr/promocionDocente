import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { useApplicationUpdates } from '../hooks/useApplicationUpdates';
import { fetchApplications } from '../services/applications-service';
import { fetchProcesses } from '../services/processes-service';
import { formatDateTime } from '../utils/format';
import type { ApplicationSummary, ProcessSummary } from '../types/api';

const SIMPLE_STATUS_LABELS: Record<string, string> = {
  'all': 'Todos los estados',
  'submitted': 'Enviada',
  'th_approved': 'Pendiente (Revisión TH)',
  'th_rejected': 'Rechazado (TH)',
  'cp_rejected': 'Rechazado (CP)',
  'appealed': 'Apelados',
  'approved': 'Aprobados',
  'rejected': 'Rechazados'
};

export default function ListaPostulaciones() {
  const { user } = useAuth();
  const { selectedProcess } = useSelectedProcess();
  const navigate = useNavigate();
  const { subscribe } = useApplicationUpdates();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processFilter, setProcessFilter] = useState<string>('');
  const [searchCedula, setSearchCedula] = useState('');
  const [debouncedSearchCedula, setDebouncedSearchCedula] = useState('');
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.backendRole === 'teacher';
  const isTH = user?.backendRole === 'th';
  const isCp = user?.backendRole === 'cp';
  const isReviewer = isTH || isCp;

  // Cargar procesos al montar el componente
  useEffect(() => {
    fetchProcesses()
      .then(data => {
        setProcesses(data);
        // Para TH, usar el proceso seleccionado; para otros, el primer proceso por defecto
        if (isReviewer && selectedProcess) {
          setProcessFilter(selectedProcess.id);
        } else if (data.length > 0 && !processFilter) {
          setProcessFilter(data[0].id);
        }
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los procesos.'));
  }, [isTH, selectedProcess]);

  // Debounce la búsqueda por cédula (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchCedula(searchCedula);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchCedula]);

  // Handler para actualizaciones en tiempo real
  const handleApplicationUpdate = useCallback((updated: ApplicationSummary) => {
    setApplications(prev => {
      const exists = prev.find(app => app.id === updated.id);

      // SEGURIDAD: Docentes solo ven sus propias postulaciones
      if (isTeacher && updated.teacherUserId !== user?.userId) {
        return prev;
      }

      // Verificar si la postulación coincide con los filtros actuales
      // Si el filtro está vacío, considerar como si pasara (no ha sido inicializado aún)
      const matchesStatusFilter = statusFilter === 'all' || statusFilter === updated.status;
      const matchesProcessFilter = !processFilter || processFilter === updated.processId;
      const matchesCedulaFilter = !debouncedSearchCedula || (updated.teacherIdentification?.includes(debouncedSearchCedula) ?? false);

      const passesFilters = matchesStatusFilter && matchesProcessFilter && matchesCedulaFilter;

      if (exists) {
        // Actualizar si existe
        if (passesFilters) {
          // Mantenerla si sigue cumpliendo los filtros
          return prev.map(app => app.id === updated.id ? updated : app);
        } else {
          // Removerla si ya no cumple los filtros
          return prev.filter(app => app.id !== updated.id);
        }
      } else {
        // Agregar si es nueva y pasa los filtros
        if (passesFilters) {
          return [updated, ...prev];
        } else {
          // No agregarla si no pasa los filtros
          return prev;
        }
      }
    });
  }, [statusFilter, processFilter, debouncedSearchCedula, isTeacher, user?.userId]);

  // Recargar aplicaciones cuando cambian los filtros
  useEffect(() => {
    setLoading(true);
    const statusToSend = statusFilter === 'all' ? undefined : statusFilter;
    // Para TH, usar el proceso seleccionado; para otros, usar el filtro
    const processToSend = isReviewer && selectedProcess ? selectedProcess.id : processFilter;
    fetchApplications(statusToSend, processToSend, debouncedSearchCedula || undefined)
      .then(setApplications)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las postulaciones.'))
      .finally(() => setLoading(false));
  }, [statusFilter, processFilter, debouncedSearchCedula, isTH, selectedProcess]);

  // Suscribirse a actualizaciones en tiempo real
  useEffect(() => {
    const unsubscribe = subscribe(handleApplicationUpdate);
    return () => unsubscribe();
  }, [subscribe, handleApplicationUpdate]);

  // Cola sugerida según el rol
  const suggestedQueue = user?.backendRole === 'th' ? 'submitted' : user?.backendRole === 'cp' ? 'th_approved' : null;

  const pendingForMe = suggestedQueue
    ? applications.filter((a) => a.status === suggestedQueue).length
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-4">
          <h1 className="text-2xl">Postulaciones</h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? 'Sus postulaciones y el estado del proceso de revisión.'
              : 'Postulaciones registradas en los procesos de promoción.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          {!isTeacher && (
            <Input
              placeholder="Buscar por cédula..."
              value={searchCedula}
              onChange={(e) => setSearchCedula(e.target.value)}
              disabled={loading}
              className="flex-1 min-w-[200px]"
            />
          )}
          {isReviewer && selectedProcess && (
            <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Trabajando en: <span className="font-semibold text-blue-900">{selectedProcess.name}</span>
              </p>
            </div>
          )}
          {!isReviewer && (
            <Select value={processFilter} onValueChange={setProcessFilter} disabled={loading}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Seleccionar proceso" />
              </SelectTrigger>
              <SelectContent>
                {processes.map(process => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SIMPLE_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(searchCedula || statusFilter !== 'all') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchCedula('');
                setStatusFilter('all');
              }}
              disabled={loading}
            >
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {suggestedQueue && pendingForMe > 0 && (
        <Card className="border-[#C9982E] bg-amber-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-[#C9982E]" />
            <p className="text-sm">
              Tiene <span className="font-semibold">{pendingForMe}</span> postulación
              {pendingForMe === 1 ? '' : 'es'} pendiente{pendingForMe === 1 ? '' : 's'} de su revisión.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Postulaciones ({applications.length})</CardTitle>
          {loading && (
            <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-transparent animate-pulse" />
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {!isTeacher && <TableHead>Docente</TableHead>}
                  {!isTeacher && <TableHead>Cédula</TableHead>}
                  <TableHead>Proceso</TableHead>
                  <TableHead>Transición</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviada</TableHead>
                  {!isTeacher && <TableHead>Score</TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow
                    key={application.id}
                    className="hover:bg-secondary"
                  >
                    {!isTeacher && (
                      <TableCell className="font-medium">{application.teacherName}</TableCell>
                    )}
                    {!isTeacher && (
                      <TableCell>{application.teacherIdentification}</TableCell>
                    )}
                    <TableCell>{application.processName}</TableCell>
                    <TableCell className="text-sm">
                      {application.fromLabel} → {application.toLabel}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                    {!isTeacher && (
                      <TableCell>
                        {application.scorePct ? (
                          <Badge variant="outline">{application.scorePct.toFixed(2)}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/postulaciones/${application.id}`)}
                      >
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {applications.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No hay postulaciones que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
