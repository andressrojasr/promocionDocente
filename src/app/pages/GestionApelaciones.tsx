import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Scale } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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
import { useSelectedProcess } from '../context/ProcessContext';
import { fetchApplications } from '../services/applications-service';
import { formatDateTime } from '../utils/format';
import type { ApplicationSummary } from '../types/api';

export default function GestionApelaciones() {
  const { user } = useAuth();
  const { selectedProcess } = useSelectedProcess();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCedula, setSearchCedula] = useState('');
  const [debouncedSearchCedula, setDebouncedSearchCedula] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('__all__');

  const isCa = user?.backendRole === 'ca';

  // Debounce la búsqueda por cédula (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchCedula(searchCedula);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchCedula]);

  useEffect(() => {
    setLoading(true);
    // Para CA el backend ya restringe el listado a postulaciones con apelación;
    // para el docente se filtran las suyas en estados relacionados con apelación.
    const processId = isCa && selectedProcess ? selectedProcess.id : undefined;
    const statusToSend = isCa && statusFilter !== '__all__' ? statusFilter : undefined;
    fetchApplications(statusToSend, processId, debouncedSearchCedula || undefined)
      .then((all) =>
        setApplications(
          isCa
            ? all
            : all.filter((a) => a.status === 'appealed' || a.status === 'cp_rejected')))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las apelaciones.'))
      .finally(() => setLoading(false));
  }, [isCa, selectedProcess, debouncedSearchCedula, statusFilter]);

  const pending = applications.filter((a) => a.status === 'appealed').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Apelaciones</h1>
          <p className="text-muted-foreground">
            {isCa
              ? 'Apelaciones presentadas por los docentes ante rechazos de la Comisión de Promoción.'
              : 'Sus postulaciones rechazadas por la Comisión de Promoción y sus apelaciones.'}
          </p>
        </div>
        {isCa && selectedProcess && (
          <div className="px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-gray-600">
              Trabajando en: <span className="font-semibold text-blue-900">{selectedProcess.name}</span>
            </p>
          </div>
        )}
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
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            {isCa && (
              <Input
                placeholder="Buscar por cédula..."
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
                disabled={loading}
                className="flex-1 min-w-[200px] max-w-xs"
              />
            )}
            {isCa && (
              <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  <SelectItem value="appealed">Pendientes de CA</SelectItem>
                  <SelectItem value="approved">Aprobadas</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Cargando apelaciones...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {isCa && <TableHead>Docente</TableHead>}
                  {isCa && <TableHead>Cédula</TableHead>}
                  <TableHead>Proceso</TableHead>
                  <TableHead>Transición</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviada</TableHead>
                  {isCa && <TableHead>Score</TableHead>}
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((application) => (
                  <TableRow
                    key={application.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/postulaciones/${application.id}`)}
                  >
                    {isCa && (
                      <TableCell className="font-medium">{application.teacherName}</TableCell>
                    )}
                    {isCa && (
                      <TableCell>{application.teacherIdentification}</TableCell>
                    )}
                    <TableCell>{application.processName}</TableCell>
                    <TableCell className="text-sm">
                      {application.fromLabel} → {application.toLabel}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                    {isCa && (
                      <TableCell>
                        {application.scorePct ? (
                          <Badge variant="outline">{application.scorePct.toFixed(2)}%</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/postulaciones/${application.id}`)}
                      >
                        Ver
                      </Button>
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
