import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, CheckCircle, Scale, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useSelectedProcess } from '../context/ProcessContext';
import { useReviewSession } from '../context/ReviewSessionContext';
import { useApplicationUpdates } from '../hooks/useApplicationUpdates';
import { fetchApplications } from '../services/applications-service';
import { fetchProcesses } from '../services/processes-service';
import { formatDateTime } from '../utils/format';
import type { ApplicationSummary } from '../types/api';

/** Panel de la Comisión de Apelaciones: qué apelaciones hay por resolver y en qué facultad. */
export default function DashboardCA() {
  const navigate = useNavigate();
  const { selectedProcess, setSelectedProcess } = useSelectedProcess();
  const { activeSession } = useReviewSession();
  const { subscribe } = useApplicationUpdates();
  const [allApplications, setAllApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const processId = selectedProcess?.id;
  const hasUsableSession = !!activeSession && activeSession.processId === processId;

  const load = useCallback(() => {
    if (!processId) return;
    // Se trae todo lo que CA puede ver (todos los procesos) para avisar también de lo pendiente en otros procesos.
    fetchApplications()
      .then(setAllApplications)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el panel.'))
      .finally(() => setLoading(false));
  }, [processId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  // Cualquier cambio en tiempo real recarga las cifras
  useEffect(() => {
    const unsubscribe = subscribe(() => load());
    return () => unsubscribe();
  }, [subscribe, load]);

  const applications = allApplications.filter((a) => a.processId === processId);

  // Apelaciones pendientes en procesos distintos al seleccionado
  const pendingInOtherProcesses = Object.values(
    allApplications
      .filter((a) => a.status === 'appealed' && a.processId !== processId)
      .reduce<Record<string, { processId: string; processName: string; count: number }>>((acc, a) => {
        acc[a.processId] ??= { processId: a.processId, processName: a.processName, count: 0 };
        acc[a.processId].count += 1;
        return acc;
      }, {})
  );

  const switchToProcess = async (targetProcessId: string) => {
    try {
      const target = (await fetchProcesses()).find((process) => process.id === targetProcessId);
      if (!target) {
        toast.error('No se encontró el proceso.');
        return;
      }
      setSelectedProcess(target);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar de proceso.');
    }
  };

  // Con sesión activa las cifras se enfocan en su facultad; sin sesión, todo el proceso.
  const scoped = hasUsableSession
    ? applications.filter((a) => a.facultyId === activeSession!.facultyId)
    : applications;
  const pending = scoped.filter((a) => a.status === 'appealed');
  const approved = scoped.filter((a) => a.status === 'approved');
  const rejected = scoped.filter((a) => a.status === 'rejected');

  const pendingByFaculty = Object.values(
    applications
      .filter((a) => a.status === 'appealed')
      .reduce<Record<string, { facultyId: string; facultyName: string; count: number }>>((acc, a) => {
        const key = a.facultyId ?? '__none__';
        acc[key] ??= { facultyId: a.facultyId ?? '', facultyName: a.facultyName ?? 'Sin facultad', count: 0 };
        acc[key].count += 1;
        return acc;
      }, {})
  ).sort((a, b) => b.count - a.count);

  const plural = (n: number, singular: string, pluralForm: string) => (n === 1 ? singular : pluralForm);

  const statCards = [
    { title: 'Apelaciones pendientes', value: pending.length, icon: <Scale className="h-6 w-6 text-purple-600" /> },
    { title: 'Aprobadas por CA', value: approved.length, icon: <CheckCircle className="h-6 w-6 text-green-600" /> },
    { title: 'Rechazadas por CA', value: rejected.length, icon: <XCircle className="h-6 w-6 text-red-600" /> }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Panel de Control - CA</h1>
        <p className="text-muted-foreground">Apelaciones presentadas ante rechazos de la Comisión de Promoción</p>
      </div>

      <Card className={pending.length > 0 ? 'border-purple-300 bg-purple-50/50' : undefined}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <Scale className={`h-5 w-5 ${pending.length > 0 ? 'text-purple-600' : 'text-muted-foreground'}`} />
            <div>
              <p className="text-sm">
                {hasUsableSession ? (
                  pending.length > 0 ? (
                    <>
                      Tiene <span className="font-semibold">{pending.length}</span>{' '}
                      {plural(pending.length, 'apelación pendiente', 'apelaciones pendientes')} de resolución en su
                      sesión activa ({activeSession!.facultyName}).
                    </>
                  ) : (
                    <>Su sesión activa ({activeSession!.facultyName}) no tiene apelaciones pendientes.</>
                  )
                ) : pending.length > 0 ? (
                  <>
                    Tiene <span className="font-semibold">{pending.length}</span>{' '}
                    {plural(pending.length, 'apelación pendiente', 'apelaciones pendientes')} de resolución en el
                    proceso (todas las facultades).
                  </>
                ) : (
                  'No tiene apelaciones pendientes de resolución en este proceso.'
                )}
              </p>
              {!hasUsableSession && pendingByFaculty.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Para resolverlas debe iniciar una sesión de revisión con la facultad correspondiente:
                </p>
              )}
              {hasUsableSession && pending.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Si hay pendientes en otra facultad, cambie de sesión desde "Sesiones".
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {hasUsableSession && (
              <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => navigate('/apelaciones')}>
                Resolver apelaciones
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate('/sesiones')}>
              Sesiones
            </Button>
          </div>
        </CardContent>
        {!hasUsableSession && pendingByFaculty.length > 0 && (
          <CardContent className="flex flex-wrap gap-2 pb-5 pt-0">
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
          </CardContent>
        )}
      </Card>

      {pendingInOtherProcesses.length > 0 && (
        <Card className="border-purple-300 bg-purple-50/50">
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-3">
              <Scale className="h-5 w-5 text-purple-600" />
              <p className="text-sm">
                También tiene apelaciones pendientes en {pendingInOtherProcesses.length === 1 ? 'otro proceso' : 'otros procesos'}.
                Cambie de proceso para resolverlas:
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {pendingInOtherProcesses.map((p) => (
                <Button
                  key={p.processId}
                  variant="outline"
                  size="sm"
                  className="border-purple-300 bg-white"
                  onClick={() => void switchToProcess(p.processId)}
                >
                  Trabajar en {p.processName}
                  <Badge className="ml-2 bg-purple-600">{p.count}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                </div>
                <div className="rounded-lg bg-secondary p-3">{stat.icon}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Apelaciones por resolver ({pending.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/apelaciones')}>
              Ver todas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Docente</TableHead>
                <TableHead>Facultad</TableHead>
                <TableHead>Transición</TableHead>
                <TableHead>Enviada</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.slice(0, 5).map((application) => (
                <TableRow
                  key={application.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/postulaciones/${application.id}`)}
                >
                  <TableCell className="font-medium">{application.teacherName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{application.facultyName ?? '—'}</TableCell>
                  <TableCell className="text-sm">
                    {application.fromLabel} → {application.toLabel}
                  </TableCell>
                  <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                  <TableCell>
                    <ApplicationStatusBadge status={application.status} />
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    {loading ? 'Cargando...' : 'No hay apelaciones pendientes de resolución.'}
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
