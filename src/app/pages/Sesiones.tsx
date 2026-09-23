import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ChevronDown, ChevronUp, Download, Lock, Plus, Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { CommissionMembersEditor, type CommissionMemberDraft } from '../components/CommissionMembersEditor';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { useReviewSession } from '../context/ReviewSessionContext';
import { fetchFaculties } from '../services/faculties-service';
import { fetchCommissions, createCommission } from '../services/commissions-service';
import { fetchReviewSessions, createReviewSession, closeReviewSession } from '../services/review-sessions-service';
import { downloadCpActaBySession } from '../services/actas-service';
import { buildDraftFromPrincipal } from '../utils/commission-draft';
import { formatDate, formatDateTime } from '../utils/format';
import type { Commission, CommissionType, Faculty, ReviewSession } from '../types/api';

type ClosedFilter = 'active' | 'closed' | 'all';

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function Sesiones() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { selectedProcess } = useSelectedProcess();
  const { activeSession, setActiveSession, clearActiveSession } = useReviewSession();
  const isCp = user?.backendRole === 'cp';
  const isCa = user?.backendRole === 'ca';
  const type: CommissionType = isCa ? 'ca' : 'cp';
  const listPath = isCa ? '/apelaciones' : '/postulaciones';
  const processId = selectedProcess?.id ?? '';

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [facultyId, setFacultyId] = useState('__all__');
  const [closedFilter, setClosedFilter] = useState<ClosedFilter>('active');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sessions, setSessions] = useState<ReviewSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [closingId, setClosingId] = useState<string | null>(null);

  // Panel inline "+ Nueva sesión"
  const [creatingSession, setCreatingSession] = useState(false);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loadingCommissions, setLoadingCommissions] = useState(false);
  const [newSessionCommissionId, setNewSessionCommissionId] = useState('');
  const [expandedCommissionId, setExpandedCommissionId] = useState<string | null>(null);
  const [newSessionFacultyId, setNewSessionFacultyId] = useState('');
  const [creatingCommission, setCreatingCommission] = useState(false);
  const [newCommissionDate, setNewCommissionDate] = useState(todayIsoDate());
  const [newCommissionMembers, setNewCommissionMembers] = useState<CommissionMemberDraft[]>([]);
  const [savingCommission, setSavingCommission] = useState(false);
  const [starting, setStarting] = useState(false);
  const autoOpenHandled = useRef(false);

  useEffect(() => {
    fetchFaculties()
      .then(setFaculties)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las facultades.'));
  }, []);

  // Si venimos del dashboard con una facultad pendiente sugerida, abrir el panel de
  // nueva sesión directamente con esa facultad preseleccionada.
  useEffect(() => {
    const presetFacultyId = (location.state as { autoOpenFacultyId?: string } | null)?.autoOpenFacultyId;
    if (presetFacultyId && processId && !autoOpenHandled.current) {
      autoOpenHandled.current = true;
      handleOpenNewSession(presetFacultyId);
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId]);

  const loadSessions = () => {
    if (!processId) {
      setSessions([]);
      return;
    }

    setLoading(true);
    fetchReviewSessions({
      processId,
      facultyId: facultyId !== '__all__' ? facultyId : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      closed: closedFilter === 'active' ? false : closedFilter === 'closed' ? true : undefined
    })
      .then(setSessions)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron buscar las sesiones.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId, facultyId, closedFilter, dateFrom, dateTo]);

  const handleContinue = (session: ReviewSession) => {
    setActiveSession(session);
    toast.success('Sesión activada.');
    navigate(listPath);
  };

  const handleDownload = async (session: ReviewSession) => {
    try {
      setDownloadingId(session.id);
      await downloadCpActaBySession(session.id, session.facultyName);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el acta.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleClose = async (session: ReviewSession) => {
    try {
      setClosingId(session.id);
      await closeReviewSession(session.id);
      if (activeSession?.id === session.id) {
        clearActiveSession();
      }
      toast.success('Sesión cerrada. Ya no podrá usarse para decidir postulaciones.');
      loadSessions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    } finally {
      setClosingId(null);
    }
  };

  const loadCommissions = () => {
    if (!processId) return;
    setLoadingCommissions(true);
    fetchCommissions(processId, type)
      .then((list) => {
        setCommissions(list);
        const principal = list.find((c) => c.isPrincipal);
        setNewSessionCommissionId(principal?.id ?? list[0]?.id ?? '');
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las comisiones.'))
      .finally(() => setLoadingCommissions(false));
  };

  const handleOpenNewSession = (presetFacultyId?: string) => {
    setNewSessionFacultyId(presetFacultyId ?? '');
    setCreatingCommission(false);
    setCreatingSession(true);
    loadCommissions();
  };

  const handleOpenCreateCommission = () => {
    setNewCommissionDate(todayIsoDate());
    setNewCommissionMembers(buildDraftFromPrincipal(commissions.find((c) => c.isPrincipal)));
    setCreatingCommission(true);
  };

  const handleCreateCommission = async () => {
    if (newCommissionMembers.some((m) => !m.teacher)) {
      toast.error('Debe integrar los 6 cargos de la comisión.');
      return;
    }

    try {
      setSavingCommission(true);
      // isPrincipal lo decide el backend: la comisión principal del proceso ya existe
      // desde su creación; esta siempre se registra como comisión de delegados.
      const created = await createCommission({
        processId,
        type,
        isPrincipal: false,
        date: new Date(newCommissionDate).toISOString(),
        members: newCommissionMembers.map((m) => ({
          cargoLabel: m.cargoLabel,
          teacherIdentification: m.teacher!.identification,
          teacherFullName: m.teacher!.fullName,
          teacherExternalId: m.teacher!.teacherId
        }))
      });
      toast.success('Comisión registrada correctamente.');
      setCreatingCommission(false);
      loadCommissions();
      setNewSessionCommissionId(created.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la comisión.');
    } finally {
      setSavingCommission(false);
    }
  };

  const selectedNewFaculty = faculties.find((f) => f.id === newSessionFacultyId);

  const handleStartSession = async () => {
    if (!newSessionCommissionId) {
      toast.error('Seleccione o cree una comisión.');
      return;
    }
    if (!selectedNewFaculty) {
      toast.error('Seleccione una facultad.');
      return;
    }

    try {
      setStarting(true);
      const session = await createReviewSession({
        processId,
        type,
        commissionId: newSessionCommissionId,
        facultyId: newSessionFacultyId,
        facultyName: selectedNewFaculty.name
      });
      setActiveSession(session);
      toast.success('Sesión de revisión iniciada.');
      navigate(listPath);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo iniciar la sesión de revisión.');
    } finally {
      setStarting(false);
    }
  };

  if (!selectedProcess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl">Sesiones</h1>
          <p className="text-muted-foreground">Sesiones de revisión del proceso en el que está trabajando.</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-4">
            <p>Seleccione un proceso para ver o iniciar sesiones de revisión.</p>
            <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => navigate('/promociones')}>
              Seleccionar proceso
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl">Sesiones</h1>
          <p className="text-muted-foreground">
            Proceso: <span className="font-medium text-foreground">{selectedProcess.name}</span> · Encuentre una
            sesión activa para retomarla, ciérrela cuando termine, o descargue el acta de una ya decidida.
          </p>
        </div>
        {(isCp || isCa) && !creatingSession && (
          <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => handleOpenNewSession()}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva sesión
          </Button>
        )}
      </div>

      {creatingSession && (
        <Card className="border-[#00345E]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Nueva sesión de revisión</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setCreatingSession(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {!creatingCommission ? (
              <div className="space-y-3">
                <Label className="text-sm">Comisión</Label>
                {loadingCommissions ? (
                  <p className="py-6 text-center text-muted-foreground">Cargando comisiones...</p>
                ) : commissions.length === 0 ? (
                  <p className="py-6 text-center text-muted-foreground">
                    Este proceso no tiene comisiones registradas. Cree una para continuar.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {commissions.map((commission) => {
                      const isSelected = newSessionCommissionId === commission.id;
                      const isExpanded = expandedCommissionId === commission.id;
                      return (
                        <div
                          key={commission.id}
                          className={`rounded-lg border ${isSelected ? 'border-[#00345E] ring-1 ring-[#00345E]' : ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => setNewSessionCommissionId(commission.id)}
                            className={`flex w-full items-center justify-between p-3 text-left hover:bg-secondary ${
                              isSelected ? 'bg-secondary/60' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {commission.isPrincipal ? (
                                <Badge className="bg-[#00345E]">
                                  <Star className="mr-1 h-3 w-3" /> Principal
                                </Badge>
                              ) : (
                                <Badge variant="outline">Delegados</Badge>
                              )}
                              <div>
                                <p className="font-medium">Sesión del {formatDate(commission.date)}</p>
                                <p className="text-xs text-muted-foreground">
                                  Creada por {commission.createdByName} · {formatDateTime(commission.createdAt)}
                                </p>
                              </div>
                            </div>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedCommissionId(isExpanded ? null : commission.id);
                              }}
                              className="flex items-center gap-1 rounded p-1 text-sm text-muted-foreground hover:bg-secondary"
                            >
                              {commission.members.length} integrantes
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </span>
                          </button>
                          {isExpanded && (
                            <div className="space-y-1.5 border-t p-3">
                              {commission.members.map((member) => (
                                <div key={member.orderIndex} className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                                  <span className="text-muted-foreground">{member.cargoLabel}</span>
                                  <span className="font-medium">
                                    {member.teacherFullName} · {member.teacherIdentification}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Button variant="outline" onClick={handleOpenCreateCommission}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear nueva comisión
                </Button>

                <div className="space-y-1.5 pt-2">
                  <Label className="text-sm">Facultad</Label>
                  <Select value={newSessionFacultyId} onValueChange={setNewSessionFacultyId}>
                    <SelectTrigger className="w-full md:w-96">
                      <SelectValue placeholder="Seleccionar facultad" />
                    </SelectTrigger>
                    <SelectContent>
                      {faculties.map((faculty) => (
                        <SelectItem key={faculty.id} value={faculty.id}>
                          {faculty.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setCreatingSession(false)} disabled={starting}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={() => void handleStartSession()}
                    disabled={starting || !newSessionCommissionId || !newSessionFacultyId}
                    className="bg-[#00345E]"
                  >
                    {starting ? 'Iniciando...' : 'Iniciar sesión'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha de la sesión</Label>
                    <Input type="date" value={newCommissionDate} onChange={(e) => setNewCommissionDate(e.target.value)} />
                  </div>
                </div>

                {commissions.some((c) => c.isPrincipal) && (
                  <p className="text-sm text-muted-foreground">
                    Se prellenó con los integrantes de la comisión principal actual. Reemplace solo los cargos que
                    necesiten delegado.
                  </p>
                )}

                <CommissionMembersEditor
                  members={newCommissionMembers}
                  onChange={setNewCommissionMembers}
                  disabled={savingCommission}
                />

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setCreatingCommission(false)} disabled={savingCommission}>
                    Cancelar
                  </Button>
                  <Button onClick={() => void handleCreateCommission()} disabled={savingCommission} className="bg-[#00345E]">
                    {savingCommission ? 'Guardando...' : 'Registrar comisión'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <Label className="text-xs">Estado</Label>
            <Select value={closedFilter} onValueChange={(v) => setClosedFilter(v as ClosedFilter)} disabled={loading}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="closed">Cerradas</SelectItem>
                <SelectItem value="all">Todas</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Facultad</Label>
            <Select value={facultyId} onValueChange={setFacultyId} disabled={loading}>
              <SelectTrigger className="w-60">
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
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Desde</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} disabled={loading} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Hasta</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} disabled={loading} />
          </div>
          {(facultyId !== '__all__' || dateFrom || dateTo || closedFilter !== 'active') && (
            <Button
              variant="outline"
              onClick={() => {
                setFacultyId('__all__');
                setDateFrom('');
                setDateTo('');
                setClosedFilter('active');
              }}
              disabled={loading}
            >
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesiones ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-muted-foreground">Buscando sesiones...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facultad</TableHead>
                  <TableHead>Comisión</TableHead>
                  <TableHead>Creada por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => {
                  const isClosed = session.closedAt !== null;
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{session.facultyName}</TableCell>
                      <TableCell>
                        {session.commissionIsPrincipal ? (
                          <Badge className="bg-[#00345E]">
                            <Star className="mr-1 h-3 w-3" /> Principal
                          </Badge>
                        ) : (
                          `Sesión del ${formatDate(session.commissionDate)}`
                        )}
                      </TableCell>
                      <TableCell>{session.createdByName}</TableCell>
                      <TableCell>{formatDateTime(session.createdAt)}</TableCell>
                      <TableCell>
                        {isClosed ? (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Lock className="mr-1 h-3 w-3" /> Cerrada
                          </Badge>
                        ) : (
                          <Badge className="bg-green-700">Activa</Badge>
                        )}
                      </TableCell>
                      <TableCell className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" disabled={isClosed} onClick={() => handleContinue(session)}>
                          Continuar
                        </Button>
                        {isCp && (
                          <Button
                            size="sm"
                            className="bg-[#00345E]"
                            disabled={downloadingId === session.id}
                            onClick={() => void handleDownload(session)}
                          >
                            <Download className="mr-1 h-3.5 w-3.5" />
                            {downloadingId === session.id ? 'Generando...' : 'Acta PDF'}
                          </Button>
                        )}
                        {!isClosed && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                            disabled={closingId === session.id}
                            onClick={() => void handleClose(session)}
                          >
                            {closingId === session.id ? 'Cerrando...' : 'Cerrar'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No hay sesiones que coincidan con los filtros.
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
