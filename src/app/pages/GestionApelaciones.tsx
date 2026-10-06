import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { fetchApplications } from '../services/applications-service';
import { formatDateTime } from '../utils/format';
import type { ApplicationSummary } from '../types/api';
import ApelacionesCA from './ApelacionesCA';

/** Apelaciones del docente: sus postulaciones rechazadas por CP y las que ya apeló. */
function ApelacionesDocente() {
  const navigate = useNavigate();
  const { selectedProcess } = useSelectedProcess();
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications(undefined, selectedProcess?.id)
      .then((all) => setApplications(all.filter((a) => a.status === 'appealed' || a.status === 'cp_rejected')))
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las apelaciones.'))
      .finally(() => setLoading(false));
  }, [selectedProcess?.id]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Apelaciones</h1>
        <p className="text-muted-foreground">Sus postulaciones rechazadas por la Comisión de Promoción y sus apelaciones.</p>
      </div>

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
                  <TableHead>Proceso</TableHead>
                  <TableHead>Transición</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Enviada</TableHead>
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
                    <TableCell>{application.processName}</TableCell>
                    <TableCell className="text-sm">
                      {application.fromLabel} → {application.toLabel}
                    </TableCell>
                    <TableCell>
                      <ApplicationStatusBadge status={application.status} />
                    </TableCell>
                    <TableCell>{formatDateTime(application.submittedAt)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/postulaciones/${application.id}`)}>
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

export default function GestionApelaciones() {
  const { user } = useAuth();
  return user?.backendRole === 'ca' ? <ApelacionesCA /> : <ApelacionesDocente />;
}
