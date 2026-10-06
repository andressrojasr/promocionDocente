import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { ReviewSessionDialog } from '../components/ReviewSessionDialog';
import { useReviewSession } from '../context/ReviewSessionContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { useApplicationUpdates } from '../hooks/useApplicationUpdates';
import { fetchApplications } from '../services/applications-service';
import { fetchReviewSessionDetail } from '../services/review-sessions-service';
import { formatDateTime } from '../utils/format';
import type { ApplicationSummary, ReviewSession } from '../types/api';

type Tab = 'pending' | 'decided';

/**
 * Apelaciones de la Comisión de Apelaciones, con la misma lógica que Postulaciones de CP:
 * trabaja dentro de la sesión activa (proceso + facultad) y separa las apelaciones
 * pendientes de las ya resueltas (aprobadas o rechazadas).
 */
export default function ApelacionesCA() {
  const navigate = useNavigate();
  const { activeSession } = useReviewSession();
  const { selectedProcess } = useSelectedProcess();
  const { subscribe } = useApplicationUpdates();
  const [tab, setTab] = useState<Tab>('pending');
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchCedula, setSearchCedula] = useState('');
  const [debouncedSearchCedula, setDebouncedSearchCedula] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [viewingSession, setViewingSession] = useState<ReviewSession | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null);
  const [pendingByFaculty, setPendingByFaculty] = useState<{ facultyId: string; facultyName: string; count: number }[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchCedula(searchCedula), 500);
    return () => clearTimeout(timer);
  }, [searchCedula]);

  // Cualquier cambio en tiempo real recarga el listado
  const handleUpdate = useCallback(() => setRefreshKey((key) => key + 1), []);
  useEffect(() => {
    const unsubscribe = subscribe(handleUpdate);
    return () => unsubscribe();
  }, [subscribe, handleUpdate]);

  useEffect(() => {
    if (!activeSession) {
      setApplications([]);
      return;
    }

    setLoading(true);
    fetchApplications(
      tab === 'pending' ? 'appealed' : undefined,
      activeSession.processId,
      tab === 'decided' ? debouncedSearchCedula || undefined : undefined,
      activeSession.facultyId
    )
      .then((data) => setApplications(tab === 'decided' ? data.filter((a) => a.status !== 'appealed') : data))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las apelaciones.'))
      .finally(() => setLoading(false));
  }, [tab, activeSession, debouncedSearchCedula, refreshKey]);

  // Sin sesión activa: cuántas apelaciones pendientes hay y en qué facultad, para saber cuál iniciar.
  useEffect(() => {
    if (activeSession || !selectedProcess) {
      setPendingByFaculty([]);
      return;
    }

    fetchApplications('appealed', selectedProcess.id)
      .then((data) => {
        const byFaculty = new Map<string, { facultyId: string; facultyName: string; count: number }>();
        data.forEach((a) => {
          const key = a.facultyId ?? '__none__';
          const existing = byFaculty.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            byFaculty.set(key, { facultyId: a.facultyId ?? '', facultyName: a.facultyName ?? 'Sin facultad', count: 1 });
          }
        });
        setPendingByFaculty([...byFaculty.values()].sort((a, b) => b.count - a.count));
      })
      .catch(() => setPendingByFaculty([]));
  }, [activeSession, selectedProcess, refreshKey]);

  const handleViewSession = (reviewSessionId: string) => {
    setLoadingSessionId(reviewSessionId);
    fetchReviewSessionDetail(reviewSessionId)
      .then(setViewingSession)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar la sesión.'))
      .finally(() => setLoadingSessionId(null));
  };

  const tabClass = (value: Tab) =>
    `rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
      tab === value ? 'bg-[#00345E] text-white' : 'text-muted-foreground hover:bg-secondary'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Apelaciones</h1>
        <p className="text-muted-foreground">
          Apelaciones presentadas por los docentes ante rechazos de la Comisión de Promoción.
        </p>
      </div>

      <div className="inline-flex rounded-lg border bg-secondary/40 p-1">
        <button type="button" onClick={() => setTab('pending')} className={tabClass('pending')}>
          Pendientes de apelación
        </button>
        <button type="button" onClick={() => setTab('decided')} className={tabClass('decided')}>
          Aprobadas y rechazadas
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {tab === 'decided' && (
          <Input
            placeholder="Buscar por cédula..."
            value={searchCedula}
            onChange={(e) => setSearchCedula(e.target.value)}
            disabled={loading}
            className="min-w-[200px] max-w-sm flex-1"
          />
        )}
        {!activeSession && (
          <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => navigate('/sesiones')}>
            Iniciar sesión de revisión
          </Button>
        )}
      </div>

      {!activeSession && pendingByFaculty.length > 0 && (
        <Card className="border-purple-300 bg-purple-50/50">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-purple-600" />
              <p className="text-sm">
                Tiene <span className="font-semibold">{pendingByFaculty.reduce((sum, f) => sum + f.count, 0)}</span>{' '}
                apelación{pendingByFaculty.reduce((sum, f) => sum + f.count, 0) === 1 ? '' : 'es'} pendiente
                {pendingByFaculty.reduce((sum, f) => sum + f.count, 0) === 1 ? '' : 's'} de resolución. Para resolverlas
                inicie una sesión con la facultad correspondiente:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingByFaculty.map((f) => (
                <Button
                  key={f.facultyId || f.facultyName}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 bg-white"
                  onClick={() => navigate('/sesiones', { state: { autoOpenFacultyId: f.facultyId } })}
                >
                  Iniciar sesión: {f.facultyName}
                  <Badge className="ml-2 bg-purple-600">{f.count}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === 'pending' && applications.length > 0 && (
        <Card className="border-purple-300 bg-purple-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Scale className="h-5 w-5 text-purple-600" />
            <p className="text-sm">
              Tiene <span className="font-semibold">{applications.length}</span> apelación
              {applications.length === 1 ? '' : 'es'} pendiente{applications.length === 1 ? '' : 's'} de resolución
              en {activeSession?.facultyName}.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Apelaciones ({applications.length})</CardTitle>
          {loading && <div className="h-1 animate-pulse bg-gradient-to-r from-blue-500 via-blue-400 to-transparent" />}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Facultad</TableHead>
                  <TableHead>Transición</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviada</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow key={application.id} className="hover:bg-secondary">
                    <TableCell className="font-medium">{application.teacherName}</TableCell>
                    <TableCell>{application.teacherIdentification}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{application.facultyName ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {application.fromLabel} → {application.toLabel}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                    <TableCell>
                      {application.scorePct ? (
                        <Badge variant="outline">{application.scorePct.toFixed(2)}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/postulaciones/${application.id}`)}>
                        {tab === 'pending' ? 'Resolver' : 'Ver'}
                      </Button>
                      {tab === 'decided' && application.reviewSessionId && (
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

          {applications.length === 0 && !loading && (
            <div className="py-8 text-center text-muted-foreground">
              {!activeSession
                ? 'Inicie una sesión de revisión para ver las apelaciones de esa facultad.'
                : tab === 'pending'
                  ? 'No hay apelaciones pendientes en esta facultad.'
                  : 'Aún no hay apelaciones resueltas en esta facultad.'}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewSessionDialog session={viewingSession} onClose={() => setViewingSession(null)} />
    </div>
  );
}
