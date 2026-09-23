import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { Clock, Download, Eye } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { useReviewSession } from '../context/ReviewSessionContext';
import { useApplicationUpdates } from '../hooks/useApplicationUpdates';
import { fetchApplications } from '../services/applications-service';
import { fetchProcesses } from '../services/processes-service';
import { fetchFaculties } from '../services/faculties-service';
import { fetchReviewSessionDetail } from '../services/review-sessions-service';
import { downloadCpActaBySession } from '../services/actas-service';
import { formatDate, formatDateTime } from '../utils/format';
import type { ApplicationSummary, Faculty, ProcessSummary, ReviewSession } from '../types/api';

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

/** Estados que cuentan como "decidido" por CP (aprobado, o rechazado aunque siga apelable). */
const CP_DECIDED_STATUSES = new Set(['approved', 'cp_rejected', 'rejected']);

export default function ListaPostulaciones() {
  const { user } = useAuth();
  const { selectedProcess } = useSelectedProcess();
  const { activeSession } = useReviewSession();
  const navigate = useNavigate();
  const { subscribe } = useApplicationUpdates();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [processFilter, setProcessFilter] = useState<string>('');
  const [searchCedula, setSearchCedula] = useState('');
  const [debouncedSearchCedula, setDebouncedSearchCedula] = useState('');
  const [loading, setLoading] = useState(true);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultyFilter, setFacultyFilter] = useState<string>('__all__');
  const [cpTab, setCpTab] = useState<'pending' | 'decided'>('pending');
  const [viewingSession, setViewingSession] = useState<ReviewSession | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [downloadingSessionId, setDownloadingSessionId] = useState<string | null>(null);

  const isTeacher = user?.backendRole === 'teacher';
  const isTH = user?.backendRole === 'th';
  const isCp = user?.backendRole === 'cp';
  const isReviewer = isTH || isCp;
  const isCpDecided = isCp && cpTab === 'decided';
  const isCpPending = isCp && cpTab === 'pending';

  useEffect(() => {
    if (isTeacher) return;
    fetchFaculties()
      .then(setFaculties)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las facultades.'));
  }, [isTeacher]);

  // Cargar procesos al montar el componente
  useEffect(() => {
    fetchProcesses()
      .then(data => {
        setProcesses(data);
        // Para TH, usar el proceso seleccionado; para otros, el primer proceso por defecto
        if (isTH && selectedProcess) {
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

      const matchesStatusFilter = isCpDecided
        ? CP_DECIDED_STATUSES.has(updated.status)
        : isCpPending
          ? updated.status === 'th_approved'
          : statusFilter === 'all' || statusFilter === updated.status;
      const matchesProcessFilter = !processFilter || processFilter === updated.processId;
      const matchesCedulaFilter = !debouncedSearchCedula || (updated.teacherIdentification?.includes(debouncedSearchCedula) ?? false);

      const passesFilters = matchesStatusFilter && matchesProcessFilter && matchesCedulaFilter;

      if (exists) {
        if (passesFilters) {
          return prev.map(app => app.id === updated.id ? updated : app);
        } else {
          return prev.filter(app => app.id !== updated.id);
        }
      } else {
        if (passesFilters) {
          return [updated, ...prev];
        } else {
          return prev;
        }
      }
    });
  }, [statusFilter, processFilter, debouncedSearchCedula, isTeacher, isCpDecided, isCpPending, user?.userId]);

  // Recargar aplicaciones cuando cambian los filtros
  useEffect(() => {
    if (isCpPending && !activeSession) {
      setApplications([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const statusToSend = isCpPending ? 'th_approved' : isCpDecided ? undefined : statusFilter === 'all' ? undefined : statusFilter;
    // CP ("Pendientes" y "Aprobadas y rechazadas") se fija al proceso+facultad de la sesión activa. TH usa el proceso seleccionado.
    const processToSend = (isCpPending || isCpDecided) && activeSession
      ? activeSession.processId
      : isTH && selectedProcess ? selectedProcess.id : processFilter;
    const facultyToSend = (isCpPending || isCpDecided) && activeSession
      ? activeSession.facultyId
      : facultyFilter !== '__all__' ? facultyFilter : undefined;

    fetchApplications(statusToSend, processToSend, debouncedSearchCedula || undefined, facultyToSend)
      .then((data) => setApplications(isCpDecided ? data.filter((a) => CP_DECIDED_STATUSES.has(a.status)) : data))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las postulaciones.'))
      .finally(() => setLoading(false));
  }, [statusFilter, processFilter, debouncedSearchCedula, isTH, isCpPending, isCpDecided, selectedProcess, facultyFilter, activeSession]);

  // Suscribirse a actualizaciones en tiempo real
  useEffect(() => {
    const unsubscribe = subscribe(handleApplicationUpdate);
    return () => unsubscribe();
  }, [subscribe, handleApplicationUpdate]);

  // Cola sugerida según el rol (solo aplica a TH; CP ahora usa la pestaña "Pendientes")
  const suggestedQueue = isTH ? 'submitted' : null;

  const pendingForMe = suggestedQueue
    ? applications.filter((a) => a.status === suggestedQueue).length
    : 0;

  const handleViewSession = (reviewSessionId: string) => {
    setLoadingSessionId(reviewSessionId);
    fetchReviewSessionDetail(reviewSessionId)
      .then(setViewingSession)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la sesión.'))
      .finally(() => setLoadingSessionId(null));
  };

  const handleDownloadFromDialog = async () => {
    if (!viewingSession) return;
    try {
      setDownloadingSessionId(viewingSession.id);
      await downloadCpActaBySession(viewingSession.id, viewingSession.facultyName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el acta.');
    } finally {
      setDownloadingSessionId(null);
    }
  };

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

        {isCp && (
          <div className="mb-4 inline-flex rounded-lg border bg-secondary/40 p-1">
            <button
              type="button"
              onClick={() => setCpTab('pending')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                cpTab === 'pending' ? 'bg-[#00345E] text-white' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              Pendientes de revisión
            </button>
            <button
              type="button"
              onClick={() => setCpTab('decided')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                cpTab === 'decided' ? 'bg-[#00345E] text-white' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              Aprobadas y rechazadas
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          {!isTeacher && !isCpPending && (
            <Input
              placeholder="Buscar por cédula..."
              value={searchCedula}
              onChange={(e) => setSearchCedula(e.target.value)}
              disabled={loading}
              className="flex-1 min-w-[200px]"
            />
          )}
          {(isCpPending || isCpDecided) && !activeSession && (
            <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => navigate('/sesiones')}>
              Iniciar sesión de revisión
            </Button>
          )}
          {isTH && selectedProcess && (
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
          {!isCp && (
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
          )}
          {!isTeacher && !isCpPending && !isCpDecided && (
            <Select value={facultyFilter} onValueChange={setFacultyFilter} disabled={loading}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Filtrar por facultad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todas las facultades</SelectItem>
                {faculties.map((faculty) => (
                  <SelectItem key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {(searchCedula || (!isCp && statusFilter !== 'all') || facultyFilter !== '__all__') && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchCedula('');
                setStatusFilter('all');
                setFacultyFilter('__all__');
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
                  {!isTeacher && <TableHead>Facultad</TableHead>}
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
                    {!isTeacher && (
                      <TableCell className="text-sm text-muted-foreground">{application.facultyName ?? '—'}</TableCell>
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
                    <TableCell className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/postulaciones/${application.id}`)}
                      >
                        Ver
                      </Button>
                      {isCpDecided && application.reviewSessionId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loadingSessionId === application.reviewSessionId}
                          onClick={() => handleViewSession(application.reviewSessionId!)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          Sesión
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {applications.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              {(isCpPending || isCpDecided) && !activeSession
                ? 'Inicie una sesión de revisión para ver las postulaciones de esa facultad.'
                : 'No hay postulaciones que coincidan con los filtros.'}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewingSession !== null} onOpenChange={(open) => !open && setViewingSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sesión de revisión</DialogTitle>
            <DialogDescription>Comisión que aprobó o rechazó esta postulación.</DialogDescription>
          </DialogHeader>
          {viewingSession && (
            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <p>
                <span className="text-muted-foreground">Proceso: </span>
                <span className="font-medium">{viewingSession.processName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Facultad: </span>
                <span className="font-medium">{viewingSession.facultyName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Comisión: </span>
                <span className="font-medium">
                  {viewingSession.commissionIsPrincipal ? 'Principal' : `Sesión del ${formatDate(viewingSession.commissionDate)}`}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Creada por: </span>
                <span className="font-medium">{viewingSession.createdByName}</span>
              </p>
              <p>
                <span className="text-muted-foreground">Fecha: </span>
                <span className="font-medium">{formatDateTime(viewingSession.createdAt)}</span>
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewingSession(null)}>
              Cerrar
            </Button>
            {isCp && viewingSession && (
              <Button
                className="bg-[#00345E]"
                disabled={downloadingSessionId === viewingSession.id}
                onClick={() => void handleDownloadFromDialog()}
              >
                <Download className="mr-2 h-4 w-4" />
                {downloadingSessionId === viewingSession.id ? 'Generando...' : 'Descargar acta PDF'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
