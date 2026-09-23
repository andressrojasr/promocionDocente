import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Clock, CheckCircle, XCircle, TrendingUp, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useSelectedProcess } from '../context/ProcessContext';
import { useReviewSession } from '../context/ReviewSessionContext';
import { useApplicationUpdates } from '../hooks/useApplicationUpdates';
import { fetchCpDashboardData } from '../services/dashboard-cp-service';
import { fetchFaculties } from '../services/faculties-service';
import { formatDateTime } from '../utils/format';
import type { CpDashboardData } from '../types/dashboard';
import type { ApplicationSummary, Faculty } from '../types/api';

const STATUS_LABELS: Record<string, string> = {
  'submitted': 'Enviados',
  'th_approved': 'Pendiente (Revisión TH)',
  'th_rejected': 'Rechazado (TH)',
  'cp_rejected': 'Rechazado (CP)',
  'appealed': 'Apelados',
  'approved': 'Aprobados',
  'rejected': 'Rechazados'
};

export default function DashboardCPIntegrated() {
  const navigate = useNavigate();
  const { selectedProcess } = useSelectedProcess();
  const { activeSession } = useReviewSession();
  const { subscribe } = useApplicationUpdates();
  const [data, setData] = useState<CpDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
  const [searchCedula, setSearchCedula] = useState('');
  const [debouncedSearchCedula, setDebouncedSearchCedula] = useState('');
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [filterFaculty, setFilterFaculty] = useState<string>('__all__');
  const [filterDecisionDate, setFilterDecisionDate] = useState<string>('');

  const processId = selectedProcess?.id;
  const hasUsableSession = !!activeSession && activeSession.processId === processId;

  const [pendingByFaculty, setPendingByFaculty] = useState<{ facultyId: string; facultyName: string; count: number }[]>([]);

  useEffect(() => {
    fetchFaculties()
      .then(setFaculties)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las facultades.'));
  }, []);

  // Si hay una sesión de revisión activa, las cifras del panel se enfocan en su facultad
  // (la misma que verá al ir a Postulaciones); si se cierra la sesión, vuelve a "todas".
  useEffect(() => {
    if (activeSession && activeSession.processId === processId) {
      setFilterFaculty(activeSession.facultyId);
    } else {
      setFilterFaculty('__all__');
    }
  }, [activeSession?.id, activeSession?.processId, processId]);

  // Sin sesión activa: desglose de pendientes por facultad, para saber para cuál iniciar sesión.
  useEffect(() => {
    if (!processId || hasUsableSession) {
      setPendingByFaculty([]);
      return;
    }
    fetchCpDashboardData('th_approved', processId)
      .then((res) => {
        const byFaculty = new Map<string, { facultyId: string; facultyName: string; count: number }>();
        res.applications.forEach((app) => {
          const key = app.facultyId ?? '__none__';
          const existing = byFaculty.get(key);
          if (existing) {
            existing.count += 1;
          } else {
            byFaculty.set(key, {
              facultyId: app.facultyId ?? '',
              facultyName: app.facultyName ?? 'Sin facultad',
              count: 1
            });
          }
        });
        setPendingByFaculty([...byFaculty.values()].sort((a, b) => b.count - a.count));
      })
      .catch(() => setPendingByFaculty([]));
  }, [processId, hasUsableSession]);

  // Debounce la búsqueda por cédula (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchCedula(searchCedula);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchCedula]);

  // Recargar datos cuando cambian los filtros
  useEffect(() => {
    if (!processId) return;
    setLoading(true);
    fetchCpDashboardData(
      filterStatus !== '__all__' ? filterStatus : undefined,
      processId,
      debouncedSearchCedula || undefined,
      filterFaculty !== '__all__' ? filterFaculty : undefined,
      filterDecisionDate || undefined
    )
      .then(setData)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.')
      )
      .finally(() => setLoading(false));
  }, [filterStatus, processId, debouncedSearchCedula, filterFaculty, filterDecisionDate]);

  // Handler para actualizaciones en tiempo real
  const handleApplicationUpdate = useCallback((updated: ApplicationSummary) => {
    setData(prev => {
      if (!prev) return prev;
      const exists = prev.applications.find(app => app.id === updated.id);

      // Verificar si la postulación coincide con los filtros actuales
      const matchesStatusFilter = filterStatus === '__all__' || filterStatus === updated.status;
      const matchesProcessFilter = !processId || processId === updated.processId;
      const matchesCedulaFilter = !debouncedSearchCedula || (updated.teacherIdentification?.includes(debouncedSearchCedula) ?? false);

      const passesFilters = matchesStatusFilter && matchesProcessFilter && matchesCedulaFilter;

      if (exists) {
        if (passesFilters) {
          // Mantenerla si sigue cumpliendo los filtros
          return {
            ...prev,
            applications: prev.applications.map(app => app.id === updated.id ? updated : app)
          };
        } else {
          // Removerla si ya no cumple los filtros
          return {
            ...prev,
            applications: prev.applications.filter(app => app.id !== updated.id)
          };
        }
      } else {
        // Agregar si es nueva y pasa los filtros
        if (passesFilters) {
          return {
            ...prev,
            applications: [updated, ...prev.applications],
            stats: {
              ...prev.stats,
              totalApplications: prev.stats.totalApplications + 1
            }
          };
        } else {
          // No agregarla si no pasa los filtros (pero contar en totales)
          return {
            ...prev,
            stats: {
              ...prev.stats,
              totalApplications: prev.stats.totalApplications + 1
            }
          };
        }
      }
    });
  }, [filterStatus, processId, debouncedSearchCedula]);

  // Suscribirse a actualizaciones en tiempo real
  useEffect(() => {
    const unsubscribe = subscribe(handleApplicationUpdate);
    return () => unsubscribe();
  }, [subscribe, handleApplicationUpdate]);

  const { stats, applications } = data || { stats: { totalApplications: 0, pendingReview: 0, approvedByCP: 0, rejectedByCP: 0, approvalRatePercentage: 0, averageDaysToDecision: 0 }, applications: [] };

  const statCards = [
    {
      title: 'Postulaciones totales',
      value: stats.totalApplications,
      icon: <FileText className="w-6 h-6 text-[#00345E]" />
    },
    {
      title: 'Pendientes de revisión',
      value: stats.pendingReview,
      icon: <Clock className="w-6 h-6 text-yellow-600" />
    },
    {
      title: 'Aprobadas por CP',
      value: stats.approvedByCP,
      icon: <CheckCircle className="w-6 h-6 text-green-600" />
    },
    {
      title: 'Rechazadas por CP',
      value: stats.rejectedByCP,
      icon: <XCircle className="w-6 h-6 text-red-600" />
    }
  ];

  const hasActiveFilters = filterStatus !== '__all__' || searchCedula || filterFaculty !== '__all__' || filterDecisionDate;

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
      <div>
        <h1 className="text-3xl font-bold">Panel de Control - CP</h1>
        <p className="text-muted-foreground">Datos consolidados y análisis de postulaciones</p>
      </div>

      {/* Acciones rápidas: qué hacer ahora */}
      <Card className={stats.pendingReview > 0 ? 'border-[#C9982E] bg-amber-50/50' : undefined}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 ${stats.pendingReview > 0 ? 'text-[#C9982E]' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm">
                {hasUsableSession ? (
                  stats.pendingReview > 0 ? (
                    <>
                      Tiene <span className="font-semibold">{stats.pendingReview}</span> postulación
                      {stats.pendingReview === 1 ? '' : 'es'} pendiente{stats.pendingReview === 1 ? '' : 's'} de revisión
                      en su sesión activa ({activeSession!.facultyName}).
                    </>
                  ) : (
                    <>Su sesión activa ({activeSession!.facultyName}) no tiene postulaciones pendientes.</>
                  )
                ) : stats.pendingReview > 0 ? (
                  <>
                    Tiene <span className="font-semibold">{stats.pendingReview}</span> postulación
                    {stats.pendingReview === 1 ? '' : 'es'} pendiente{stats.pendingReview === 1 ? '' : 's'} de revisión
                    en el proceso (todas las facultades).
                  </>
                ) : (
                  'No tiene postulaciones pendientes de revisión.'
                )}
              </p>
              {!hasUsableSession && pendingByFaculty.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Para revisarlas debe iniciar una sesión de revisión con la facultad correspondiente:
                </p>
              )}
              {hasUsableSession && stats.pendingReview === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Si hay pendientes en otra facultad, cambie de sesión desde "Sesiones y actas".
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {hasUsableSession && (
              <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => navigate('/postulaciones')}>
                Revisar postulaciones
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/sesiones')}>
              Sesiones y actas
            </Button>
          </div>
        </CardContent>
        {!hasUsableSession && pendingByFaculty.length > 0 && (
          <CardContent className="flex flex-wrap gap-2 pt-0 pb-5">
            {pendingByFaculty.map((f) => (
              <Button
                key={f.facultyId || f.facultyName}
                variant="outline"
                size="sm"
                className="border-[#C9982E] bg-white"
                onClick={() => navigate('/sesiones', { state: { autoOpenFacultyId: f.facultyId } })}
              >
                Iniciar sesión: {f.facultyName}
                <Badge className="ml-2 bg-[#C9982E]">{f.count}</Badge>
              </Button>
            ))}
          </CardContent>
        )}
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-semibold mt-2">{stat.value}</p>
                </div>
                <div className="bg-secondary p-3 rounded-lg">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Estadísticas adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Tasa de aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-green-600">
              {stats.approvalRatePercentage.toFixed(1)}%
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.approvedByCP} de {stats.totalApplications} postulaciones aprobadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Tiempo promedio de decisión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-blue-600">
              {stats.averageDaysToDecision.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">días desde la postulación</p>
          </CardContent>
        </Card>
      </div>

      {/* Detalle de postulaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de postulaciones ({applications.length})</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filtre para analizar el detalle. Para aprobar o rechazar, use la sección Postulaciones.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Input
              placeholder="Buscar por cédula..."
              value={searchCedula}
              onChange={(e) => setSearchCedula(e.target.value)}
              disabled={loading}
              className="flex-1 min-w-[200px]"
            />

            <Select value={filterStatus} onValueChange={setFilterStatus} disabled={loading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los estados</SelectItem>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterFaculty} onValueChange={setFilterFaculty} disabled={loading}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Todas las facultades" />
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

            <Input
              type="date"
              value={filterDecisionDate}
              onChange={(e) => setFilterDecisionDate(e.target.value)}
              disabled={loading}
              className="w-[180px]"
              title="Filtrar por día de aprobación/rechazo de CP"
            />

            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStatus('__all__');
                  setSearchCedula('');
                  setFilterFaculty('__all__');
                  setFilterDecisionDate('');
                }}
                disabled={loading}
              >
                Limpiar filtros
              </Button>
            )}
          </div>

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
                {applications.map(app => (
                  <TableRow key={app.applicationId} className="hover:bg-secondary">
                    <TableCell className="font-medium">{app.teacherName}</TableCell>
                    <TableCell>{app.teacherIdentification}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{app.facultyName ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {app.fromPosition} → {app.toPosition}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={app.status as any} />
                    </TableCell>
                    <TableCell>{formatDateTime(app.submittedAt)}</TableCell>
                    <TableCell>
                      {app.scorePct ? (
                        <Badge variant="outline">{app.scorePct.toFixed(2)}%</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/postulaciones/${app.applicationId}`)}
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
