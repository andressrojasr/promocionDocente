import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
import { formatDateTime } from '../utils/format';
import type { ApplicationSummary } from '../types/api';

export default function GestionApelaciones() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const isCa = user?.backendRole === 'ca';

  useEffect(() => {
    // Para CA el backend ya restringe el listado a postulaciones con apelación;
    // para el docente se filtran las suyas en estados relacionados con apelación.
    fetchApplications()
      .then((all) =>
        setApplications(
          isCa
            ? all
            : all.filter((a) => a.status === 'appealed' || a.status === 'cp_rejected')))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las apelaciones.'))
      .finally(() => setLoading(false));
  }, [isCa]);

  const pending = applications.filter((a) => a.status === 'appealed').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Apelaciones</h1>
        <p className="text-muted-foreground">
          {isCa
            ? 'Apelaciones presentadas por los docentes ante rechazos de la Comisión de Promoción.'
            : 'Sus postulaciones rechazadas por la Comisión de Promoción y sus apelaciones.'}
        </p>
      </div>

      {isCa && pending > 0 && (
        <Card className="border-purple-300 bg-purple-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Scale className="h-5 w-5 text-purple-600" />
            <p className="text-sm">
              Tiene <span className="font-semibold">{pending}</span> apelación
              {pending === 1 ? '' : 'es'} pendiente{pending === 1 ? '' : 's'} de resolución.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Listado ({applications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando apelaciones...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Docente</TableHead>
                  <TableHead>Proceso</TableHead>
                  <TableHead>Transición</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Plazo de apelación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
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
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {application.appealDeadline ? formatDateTime(application.appealDeadline) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
                {applications.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      No hay apelaciones para mostrar.
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
