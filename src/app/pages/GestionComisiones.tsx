import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { CommissionMembersEditor, type CommissionMemberDraft } from '../components/CommissionMembersEditor';
import { useAuth } from '../context/AuthContext';
import { useSelectedProcess } from '../context/ProcessContext';
import { fetchCommissions, createCommission } from '../services/commissions-service';
import { buildDraftFromPrincipal } from '../utils/commission-draft';
import { formatDate, formatDateTime } from '../utils/format';
import type { Commission, CommissionType } from '../types/api';

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0];
}

export default function GestionComisiones() {
  const { user } = useAuth();
  const { selectedProcess } = useSelectedProcess();
  const navigate = useNavigate();
  const type: CommissionType = user?.backendRole === 'ca' ? 'ca' : 'cp';
  const title = type === 'ca' ? 'Comisión de Apelaciones' : 'Comisión de Promoción';
  const processId = selectedProcess?.id ?? '';

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [date, setDate] = useState(todayIsoDate());
  const [members, setMembers] = useState<CommissionMemberDraft[]>([]);

  const loadCommissions = () => {
    if (!processId) return;
    setLoading(true);
    fetchCommissions(processId, type)
      .then(setCommissions)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar las comisiones.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCommissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processId, type]);

  const resetForm = () => {
    setDate(todayIsoDate());
    const principal = commissions.find((c) => c.isPrincipal);
    setMembers(buildDraftFromPrincipal(principal));
  };

  const handleOpenCreate = () => {
    resetForm();
    setCreating(true);
  };

  const handleCreate = async () => {
    if (!processId) return;
    if (members.some((m) => !m.teacher)) {
      toast.error('Debe integrar los 6 cargos de la comisión.');
      return;
    }

    try {
      setSaving(true);
      // isPrincipal lo decide el backend: solo la comisión creada junto con el proceso es
      // principal; las que se crean aquí son siempre para delegados de un día concreto.
      await createCommission({
        processId,
        type,
        isPrincipal: false,
        date: new Date(date).toISOString(),
        members: members.map((m) => ({
          cargoLabel: m.cargoLabel,
          teacherIdentification: m.teacher!.identification,
          teacherFullName: m.teacher!.fullName,
          teacherExternalId: m.teacher!.teacherId
        }))
      });
      toast.success('Comisión registrada correctamente.');
      setCreating(false);
      loadCommissions();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo registrar la comisión.');
    } finally {
      setSaving(false);
    }
  };

  if (!selectedProcess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl">{title}</h1>
          <p className="text-muted-foreground">Comisiones registradas en el proceso en el que está trabajando.</p>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-4">
            <p>Seleccione un proceso para ver o registrar comisiones.</p>
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
          <h1 className="text-2xl">{title}</h1>
          <p className="text-muted-foreground">
            Proceso: <span className="font-medium text-foreground">{selectedProcess.name}</span> · Registre quiénes
            integraron la comisión cada día. Use la comisión principal por defecto, o cree una nueva con delegados
            cuando algún integrante titular no esté disponible.
          </p>
        </div>
        {!creating && (
          <Button onClick={handleOpenCreate} className="bg-[#00345E] hover:bg-[#002A4B]">
            <Plus className="mr-2 h-4 w-4" />
            Nueva comisión
          </Button>
        )}
      </div>

      {creating && (
        <Card className="border-[#00345E]">
          <CardHeader>
            <CardTitle>Nueva comisión</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Fecha de la sesión</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            {commissions.some((c) => c.isPrincipal) && (
              <p className="text-sm text-muted-foreground">
                Se prellenó con los integrantes de la comisión principal actual. Reemplace solo los cargos que
                necesiten delegado.
              </p>
            )}

            <CommissionMembersEditor members={members} onChange={setMembers} disabled={saving} />

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreating(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={() => void handleCreate()} disabled={saving} className="bg-[#00345E]">
                {saving ? 'Guardando...' : 'Registrar comisión'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Comisiones registradas ({commissions.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Cargando comisiones...</p>
          ) : commissions.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Aún no hay comisiones registradas para este proceso.
            </p>
          ) : (
            commissions.map((commission) => {
              const isOpen = expandedId === commission.id;
              return (
                <div key={commission.id} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isOpen ? null : commission.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-secondary"
                  >
                    <div className="flex items-center gap-3">
                      {commission.isPrincipal && (
                        <Badge className="bg-[#00345E]">
                          <Star className="mr-1 h-3 w-3" /> Principal
                        </Badge>
                      )}
                      <div>
                        <p className="font-medium">Sesión del {formatDate(commission.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          Creada por {commission.createdByName} · {formatDateTime(commission.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" /> {commission.members.length}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="space-y-2 border-t p-4">
                      {commission.members.map((member) => (
                        <div key={member.orderIndex} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
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
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
