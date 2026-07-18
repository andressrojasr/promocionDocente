import { useEffect, useState } from 'react';
import { FileText, Clock, CheckCircle, Upload, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ApplicationStatusBadge, ProcessStatusBadge } from '../components/ApplicationStatusBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { fetchDashboardStats } from '../services/notifications-service';
import { fetchApplications } from '../services/applications-service';
import { fetchProcesses } from '../services/processes-service';
import { formatDate, formatDateTime } from '../utils/format';
import type { ApplicationSummary, ProcessSummary } from '../types/api';

export default function DashboardDocente() {
  const navigate = useNavigate();
  const [counters, setCounters] = useState<Record<string, number>>({});
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [openProcesses, setOpenProcesses] = useState<ProcessSummary[]>([]);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchApplications(), fetchProcesses()])
      .then(([stats, apps, processes]) => {
        setCounters(stats.counters);
        setApplications(apps);
        setOpenProcesses(processes.filter((p) => p.status === 'open'));
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el dashboard.'));
  }, []);

  const stats = [
    { title: 'Mis Postulaciones', value: counters.myApplications ?? 0, icon: <Upload className="w-6 h-6 text-[#C9982E]" /> },
    { title: 'En Proceso', value: counters.myApplicationsInProgress ?? 0, icon: <Clock className="w-6 h-6 text-blue-600" /> },
    { title: 'Aprobadas', value: counters.myApplicationsApproved ?? 0, icon: <CheckCircle className="w-6 h-6 text-green-600" /> },
    { title: 'Procesos Abiertos', value: counters.openProcesses ?? 0, icon: <FileText className="w-6 h-6 text-purple-600" /> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>Panel del Docente</h1>
          <p className="text-muted-foreground">Gestione sus postulaciones y revise los procesos disponibles</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/elegibilidad')}
            variant="outline"
            className="border-[#C9982E] text-[#C9982E] hover:bg-[#C9982E]/10"
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Verificar Elegibilidad
          </Button>
          <Button onClick={() => navigate('/promociones')} className="bg-[#00345E] hover:bg-[#002A4B]">
            <FileText className="w-4 h-4 mr-2" />
            Ver Procesos
          </Button>
        </div>
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
            <CardTitle>Mis Postulaciones</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/postulaciones')}>
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proceso</TableHead>
                <TableHead>Transición</TableHead>
                <TableHead>Fecha de envío</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.slice(0, 5).map((application) => (
                <TableRow
                  key={application.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/postulaciones/${application.id}`)}
                >
                  <TableCell className="font-medium">{application.processName}</TableCell>
                  <TableCell className="text-sm">
                    {application.fromLabel} → {application.toLabel}
                  </TableCell>
                  <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={application.status} />
                  </TableCell>
                </TableRow>
              ))}
              {applications.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Aún no ha realizado postulaciones.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Procesos abiertos</CardTitle>
        </CardHeader>
        <CardContent>
          {openProcesses.length === 0 ? (
            <p className="py-4 text-center text-muted-foreground">No hay procesos abiertos en este momento.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {openProcesses.map((process) => (
                <Card
                  key={process.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/promociones/${process.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{process.name}</CardTitle>
                      <ProcessStatusBadge status={process.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Cierra el {formatDate(process.endDate)}
                    {process.hasApplied && <span className="ml-2 text-green-700">· Ya postuló</span>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
