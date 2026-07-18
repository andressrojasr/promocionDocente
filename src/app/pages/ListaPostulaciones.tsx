import { useEffect, useMemo, useState } from 'react';
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
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useAuth } from '../context/AuthContext';
import { fetchApplications } from '../services/applications-service';
import { APPLICATION_STATUS_LABELS, formatDateTime } from '../utils/format';
import type { ApplicationStatus, ApplicationSummary } from '../types/api';

export default function ListaPostulaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.backendRole === 'teacher';

  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las postulaciones.'))
      .finally(() => setLoading(false));
  }, []);

  // Cola sugerida según el rol: TH revisa enviadas, CP las aprobadas por TH.
  const suggestedQueue: ApplicationStatus | null =
    user?.backendRole === 'th' ? 'submitted' : user?.backendRole === 'cp' ? 'th_approved' : null;

  const filtered = useMemo(
    () =>
      statusFilter === 'all'
        ? applications
        : applications.filter((a) => a.status === statusFilter),
    [applications, statusFilter]
  );

  const pendingForMe = suggestedQueue
    ? applications.filter((a) => a.status === suggestedQueue).length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Postulaciones</h1>
          <p className="text-muted-foreground">
            {isTeacher
              ? 'Sus postulaciones y el estado del proceso de revisión.'
              : 'Postulaciones registradas en los procesos de promoción.'}
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {(Object.keys(APPLICATION_STATUS_LABELS) as ApplicationStatus[]).map((status) => (
              <SelectItem key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <CardTitle>Listado ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando postulaciones...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {!isTeacher && <TableHead>Docente</TableHead>}
                  <TableHead>Proceso</TableHead>
                  <TableHead>Transición</TableHead>
                  <TableHead>Fecha de envío</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Plazo de apelación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((application) => (
                  <TableRow
                    key={application.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/postulaciones/${application.id}`)}
                  >
                    {!isTeacher && (
                      <TableCell className="font-medium">{application.teacherName}</TableCell>
                    )}
                    <TableCell>{application.processName}</TableCell>
                    <TableCell className="text-sm">
                      {application.fromLabel} → {application.toLabel}
                    </TableCell>
                    <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {application.appealDeadline ? formatDateTime(application.appealDeadline) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isTeacher ? 5 : 6}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No hay postulaciones para mostrar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
