import { useEffect, useState } from 'react';
import { FileText, CheckCircle, Clock, Plus, Scale } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { useAuth } from '../context/AuthContext';
import { fetchDashboardStats } from '../services/notifications-service';
import { fetchApplications } from '../services/applications-service';
import { formatDateTime } from '../utils/format';
import type { ApplicationStatus, ApplicationSummary } from '../types/api';

/** Dashboard compartido por los roles de revisión: TH, CP y CA. */
export default function DashboardComisionAcademica() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);

  const role = user?.backendRole;
  const queueStatus: ApplicationStatus | null =
    role === 'th' ? 'submitted' : role === 'cp' ? 'th_approved' : role === 'ca' ? 'appealed' : null;

  const titles: Record<string, string> = {
    th: 'Panel de Talento Humano',
    cp: 'Panel de la Comisión de Promoción',
    ca: 'Panel de la Comisión de Apelaciones'
  };

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchApplications()])
      .then(([stats, apps]) => {
        setCounters(stats.counters);
        setApplications(apps);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.'));
  }, []);

  const pendingQueue = queueStatus ? applications.filter((a) => a.status === queueStatus) : [];

  const stats =
    role === 'cp'
      ? [
          { title: 'Pendientes de revisión', value: counters.pendingReview ?? 0, icon: <Clock className="w-6 h-6 text-yellow-600" /> },
          { title: 'Procesos abiertos', value: counters.openProcesses ?? 0, icon: <FileText className="w-6 h-6 text-[#C9982E]" /> },
          { title: 'Procesos totales', value: counters.totalProcesses ?? 0, icon: <FileText className="w-6 h-6 text-[#00345E]" /> },
          { title: 'Promociones aprobadas', value: counters.approvedApplications ?? 0, icon: <CheckCircle className="w-6 h-6 text-green-600" /> }
        ]
      : role === 'ca'
        ? [
            { title: 'Apelaciones pendientes', value: counters.pendingAppeals ?? 0, icon: <Scale className="w-6 h-6 text-purple-600" /> },
            { title: 'Apelaciones resueltas', value: counters.resolvedAppeals ?? 0, icon: <CheckCircle className="w-6 h-6 text-green-600" /> }
          ]
        : [
            { title: 'Pendientes de revisión', value: counters.pendingReview ?? 0, icon: <Clock className="w-6 h-6 text-yellow-600" /> },
            { title: 'Postulaciones totales', value: counters.totalApplications ?? 0, icon: <FileText className="w-6 h-6 text-[#00345E]" /> }
          ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>{titles[role ?? ''] ?? 'Panel de Revisión'}</h1>
          <p className="text-muted-foreground">Gestión y revisión de postulaciones de promoción docente</p>
        </div>
        {role === 'cp' && (
          <Button onClick={() => navigate('/promociones/crear')} className="bg-[#00345E] hover:bg-[#002A4B]">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proceso
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Su cola de revisión ({pendingQueue.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(role === 'ca' ? '/apelaciones' : '/postulaciones')}
            >
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Docente</TableHead>
                <TableHead>Proceso</TableHead>
                <TableHead>Transición</TableHead>
                <TableHead>Fecha de envío</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingQueue.map((application) => (
                <TableRow
                  key={application.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/postulaciones/${application.id}`)}
                >
                  <TableCell className="font-medium">{application.teacherName}</TableCell>
                  <TableCell>{application.processName}</TableCell>
                  <TableCell className="text-sm">
                    {application.fromLabel} → {application.toLabel}
                  </TableCell>
                  <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={application.status} />
                  </TableCell>
                </TableRow>
              ))}
              {pendingQueue.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No tiene postulaciones pendientes de revisión.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
