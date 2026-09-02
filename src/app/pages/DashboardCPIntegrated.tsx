import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Clock, CheckCircle, XCircle, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useSelectedProcess } from '../context/ProcessContext';
import { useApplicationUpdates } from '../hooks/useApplicationUpdates';
import { fetchCpDashboardData, exportCpDashboardToCSV } from '../services/dashboard-cp-service';
import { fetchProcesses } from '../services/processes-service';
import { formatDateTime } from '../utils/format';
import type { CpDashboardData, ProcessSummary } from '../types/dashboard';
import type { ApplicationSummary } from '../types/api';

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
  const { subscribe } = useApplicationUpdates();
  const [data, setData] = useState<CpDashboardData | null>(null);
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('__all__');
  const [filterProcess, setFilterProcess] = useState<string>(selectedProcess?.id || '__all__');
  const [searchCedula, setSearchCedula] = useState('');
  const [debouncedSearchCedula, setDebouncedSearchCedula] = useState('');

  // Cargar procesos al montar
  useEffect(() => {
    fetchProcesses()
      .then(setProcesses)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los procesos.')
      );
  }, []);

  // Actualizar filtro cuando cambia el proceso seleccionado
  useEffect(() => {
    if (selectedProcess) {
      setFilterProcess(selectedProcess.id);
    }
  }, [selectedProcess]);

  // Debounce la búsqueda por cédula (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchCedula(searchCedula);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchCedula]);

  // Recargar datos cuando cambian los filtros
  useEffect(() => {
    setLoading(true);
    fetchCpDashboardData(
      filterStatus !== '__all__' ? filterStatus : undefined,
      filterProcess !== '__all__' ? filterProcess : undefined,
      debouncedSearchCedula || undefined
    )
      .then(setData)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.')
      )
      .finally(() => setLoading(false));
  }, [filterStatus, filterProcess, debouncedSearchCedula]);

  // Handler para actualizaciones en tiempo real
  const handleApplicationUpdate = useCallback((updated: ApplicationSummary) => {
    setData(prev => {
      if (!prev) return prev;
      const exists = prev.applications.find(app => app.id === updated.id);

      // Verificar si la postulación coincide con los filtros actuales
      // Si el filtro está vacío, considerar como si pasara (no ha sido inicializado aún)
      const matchesStatusFilter = filterStatus === '__all__' || filterStatus === updated.status;
      const matchesProcessFilter = filterProcess === '__all__' || !filterProcess || filterProcess === updated.processId;
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
  }, [filterStatus, filterProcess, debouncedSearchCedula]);

  // Suscribirse a actualizaciones en tiempo real
  useEffect(() => {
    const unsubscribe = subscribe(handleApplicationUpdate);
    return () => unsubscribe();
  }, [subscribe, handleApplicationUpdate]);

  const { stats, applications } = data || { stats: { totalApplications: 0, pendingReview: 0, approvedByCP: 0, rejectedByCP: 0, approvalRatePercentage: 0, averageDaysToDecision: 0 }, applications: [] };

  const handleExportCSV = () => {
    exportCpDashboardToCSV(data);
  };

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

  return (
    <div className={`space-y-6 transition-opacity duration-300 ${loading ? 'opacity-60' : 'opacity-100'}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control - CP</h1>
          <p className="text-muted-foreground">Datos consolidados y análisis de postulaciones</p>
        </div>
        <Button
          onClick={handleExportCSV}
          className="bg-[#00345E] hover:bg-[#002A4B]"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Input
            placeholder="Buscar por cédula..."
            value={searchCedula}
            onChange={(e) => setSearchCedula(e.target.value)}
            disabled={loading}
            className="flex-1 min-w-[200px]"
          />

          {selectedProcess ? (
            <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600">
                Trabajando en: <span className="font-semibold text-blue-900">{selectedProcess.name}</span>
              </p>
            </div>
          ) : (
            <Select value={filterProcess} onValueChange={setFilterProcess} disabled={loading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos los procesos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los procesos</SelectItem>
                {processes.map(process => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

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

          {((filterProcess !== '__all__') || (filterStatus !== '__all__') || searchCedula) && (
            <Button
              variant="outline"
              onClick={() => {
                setFilterProcess('__all__');
                setFilterStatus('__all__');
                setSearchCedula('');
              }}
              disabled={loading}
            >
              Limpiar filtros
            </Button>
          )}
        </CardContent>
        {loading && (
          <div className="h-1 bg-gradient-to-r from-blue-500 via-blue-400 to-transparent animate-pulse" />
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

      {/* Tabla de postulaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Postulaciones ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Proceso</TableHead>
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
                    <TableCell>{app.processName}</TableCell>
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
