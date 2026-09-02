import { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, XCircle, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { fetchCpDashboardData, exportCpDashboardToCSV } from '../services/dashboard-cp-service';
import { formatDateTime } from '../utils/format';
import type { CpDashboardData } from '../types/dashboard';

export default function DashboardCP() {
  const [data, setData] = useState<CpDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterProcess, setFilterProcess] = useState('');
  const [searchTeacher, setSearchTeacher] = useState('');

  useEffect(() => {
    fetchCpDashboardData()
      .then(setData)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.')
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return <p className="py-8 text-center text-muted-foreground">Cargando dashboard...</p>;
  }

  const { stats, applications } = data;

  const filtered = applications.filter(app => {
    if (filterStatus && app.status !== filterStatus) return false;
    if (filterProcess && app.processName !== filterProcess) return false;
    if (searchTeacher && !app.teacherName.toLowerCase().includes(searchTeacher.toLowerCase())) return false;
    return true;
  });

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control - CP</h1>
          <p className="text-muted-foreground">Datos consolidados y análisis de postulaciones</p>
        </div>
        <Button
          onClick={() => exportCpDashboardToCSV(data)}
          className="bg-[#00345E] hover:bg-[#002A4B]"
        >
          <Download className="w-4 h-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 flex-wrap">
          <Input
            placeholder="Buscar por docente..."
            value={searchTeacher}
            onChange={(e) => setSearchTeacher(e.target.value)}
            className="flex-1 min-w-[200px]"
          />

          <Select value={filterProcess || 'all'} onValueChange={(val) => setFilterProcess(val === 'all' ? '' : val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los procesos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los procesos</SelectItem>
              {data.availableProcesses.map(process => (
                <SelectItem key={process} value={process}>{process}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus || 'all'} onValueChange={(val) => setFilterStatus(val === 'all' ? '' : val)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {data.availableStatuses.map(status => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(filterProcess || filterStatus || searchTeacher) && (
            <Button
              variant="outline"
              onClick={() => {
                setFilterProcess('');
                setFilterStatus('');
                setSearchTeacher('');
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabla de postulaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Postulaciones ({filtered.length})</CardTitle>
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
                  <TableHead>Días</TableHead>
                  <TableHead>Revisor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(app => (
                  <TableRow key={app.applicationId} className="hover:bg-secondary">
                    <TableCell className="font-medium">{app.teacherName}</TableCell>
                    <TableCell>{app.teacherId}</TableCell>
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
                      {app.daysToDecision !== undefined && app.daysToDecision !== null
                        ? `${app.daysToDecision}d`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      {app.currentReviewerName ?? '(sin revisor)'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filtered.length === 0 && (
            <div className="py-8 text-center text-muted-foreground">
              No hay postulaciones que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
