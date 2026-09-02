import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle, XCircle, ExternalLink, Scale, Clock, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription } from '../components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ApplicationStatusBadge } from '../components/ApplicationStatusBadge';
import { EligibilityDashboard } from '../components/EligibilityDashboard';
import { useAuth } from '../context/AuthContext';
import {
  appealApplication,
  fetchApplicationDetail,
  reviewApplication
} from '../services/applications-service';
import { ApiError } from '../services/http-client';
import { ITEM_TYPE_LABELS, REVIEW_STAGE_LABELS, formatDateTime } from '../utils/format';
import type { ApplicationDetail, ApplicationItemType, ApplicationStatus } from '../types/api';

/** Estado que puede revisar cada rol (espejo de la máquina de estados del backend). */
const REVIEWABLE_STATUS: Partial<Record<string, ApplicationStatus>> = {
  th: 'submitted',
  cp: 'th_approved',
  ca: 'appealed'
};

export default function RevisionPostulacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [decisionDialog, setDecisionDialog] = useState<'approved' | 'rejected' | null>(null);
  const [feedback, setFeedback] = useState('');
  const [appealDialogOpen, setAppealDialogOpen] = useState(false);
  const [justification, setJustification] = useState('');
  const [working, setWorking] = useState(false);
  const [checkedRequirements, setCheckedRequirements] = useState<Set<string>>(new Set());

  const allRequirementsChecked =
    detail?.eligibility &&
    detail.eligibility.requirements.length > 0 &&
    detail.eligibility.requirements.every((req) => checkedRequirements.has(req.code));

  const handleRequirementCheck = (code: string, checked: boolean) => {
    const newChecked = new Set(checkedRequirements);
    if (checked) {
      newChecked.add(code);
    } else {
      newChecked.delete(code);
    }
    setCheckedRequirements(newChecked);
  };

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setDetail(await fetchApplicationDetail(id));
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo cargar la postulación.');
      navigate('/postulaciones');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !detail || !user) {
    return <p className="py-8 text-center text-muted-foreground">Cargando postulación...</p>;
  }

  const { summary } = detail;
  const isOwner = user.backendRole === 'teacher' && summary.teacherUserId === user.userId;
  const canReview = REVIEWABLE_STATUS[user.backendRole] === summary.status;

  const itemsByType = detail.items.reduce<Map<ApplicationItemType, typeof detail.items>>((map, item) => {
    const list = map.get(item.itemType) ?? [];
    list.push(item);
    map.set(item.itemType, list);
    return map;
  }, new Map());

  const handleDecision = async () => {
    if (!id || !decisionDialog) return;

    if (decisionDialog === 'rejected' && !feedback.trim()) {
      toast.error('La retroalimentación es obligatoria al rechazar una postulación.');
      return;
    }

    try {
      setWorking(true);
      const updated = await reviewApplication(id, decisionDialog, feedback.trim() || undefined);
      setDetail(updated);
      setDecisionDialog(null);
      setFeedback('');
      toast.success(
        decisionDialog === 'approved'
          ? 'Postulación aprobada. El docente fue notificado.'
          : 'Postulación rechazada. La retroalimentación fue enviada al docente.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo registrar la revisión.');
    } finally {
      setWorking(false);
    }
  };

  const handleAppeal = async () => {
    if (!id) return;

    if (!justification.trim()) {
      toast.error('Ingrese la justificación de su apelación.');
      return;
    }

    try {
      setWorking(true);
      const updated = await appealApplication(id, justification.trim());
      setDetail(updated);
      setAppealDialogOpen(false);
      setJustification('');
      toast.success('Apelación presentada. La Comisión de Apelaciones revisará su caso.');
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'No se pudo presentar la apelación.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl">Postulación de {summary.teacherName}</h1>
              <ApplicationStatusBadge status={summary.status} />
            </div>
            <p className="text-muted-foreground">
              {summary.processName} · {summary.fromLabel} → {summary.toLabel} · Enviada el{' '}
              {formatDateTime(summary.submittedAt)}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          {canReview && (!detail.reviewLock?.lockedByName || detail.reviewLock.lockedByName === user?.nombre) && (
            <>
              <Button
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setDecisionDialog('rejected')}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Rechazar
              </Button>
              <Button
                className="bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => setDecisionDialog('approved')}
                disabled={!allRequirementsChecked}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Aprobar
              </Button>
            </>
          )}
          {isOwner && detail.canAppeal && (
            <Button className="bg-[#00345E]" onClick={() => setAppealDialogOpen(true)}>
              <Scale className="mr-2 h-4 w-4" />
              Apelar
            </Button>
          )}
        </div>
      </div>


      {isOwner && summary.status === 'cp_rejected' && summary.appealDeadline && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertDescription className="flex items-center gap-2 text-orange-900">
            <Clock className="h-4 w-4" />
            Su postulación fue rechazada por la Comisión de Promoción. Puede apelar hasta el{' '}
            <span className="font-semibold">{formatDateTime(summary.appealDeadline)}</span>.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel Izquierdo - Requisitos */}
        <div className="lg:col-span-1 sticky top-0 h-fit">
          <h2 className="text-sm font-semibold mb-4 text-gray-900">Requisitos</h2>
          {typeof detail.summary.scorePct === 'number' && (
            <div className="mb-4 p-3 border rounded-lg bg-purple-50 border-purple-200">
              <p className="text-xs text-gray-600">Score del docente</p>
              <p className="text-lg font-bold text-purple-900">{detail.summary.scorePct.toFixed(2)}%</p>
              {detail.eligibility?.requirementConfig?.minEvaluationScorePct && (
                <p className="text-xs text-gray-600 mt-1">
                  Requerido: {detail.eligibility.requirementConfig.minEvaluationScorePct}%
                </p>
              )}
            </div>
          )}
          <div className="space-y-3">
            {detail.eligibility ? (
              <>
                {detail.eligibility.requirements.map((req) => (
                  <div
                    key={req.code}
                    className="flex items-start gap-3 p-3 border rounded-lg"
                  >
                    {canReview && (
                      <input
                        type="checkbox"
                        checked={checkedRequirements.has(req.code)}
                        onChange={(e) => handleRequirementCheck(req.code, e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-[#00345E] focus:ring-[#00345E]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{req.label}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Requerido: {req.required}
                      </p>
                      {req.actual && (
                        <p className="text-xs text-gray-500">
                          Presentado: {req.actual}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No hay información de elegibilidad disponible.</p>
            )}
          </div>
        </div>

        {/* Panel Derecho - Documentos e Historial */}
        <div className="lg:col-span-3">
          <Tabs defaultValue="documentos">
        <TabsList>
          <TabsTrigger value="documentos">Documentación ({detail.items.length})</TabsTrigger>
          <TabsTrigger value="historial">Historial de revisión ({detail.reviews.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="documentos" className="space-y-4">
          {[...itemsByType.entries()].map(([itemType, items]) => (
            <Card key={itemType}>
              <CardHeader>
                <CardTitle className="text-base">{ITEM_TYPE_LABELS[itemType]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((item) => (
                  <div
                    key={`${item.itemType}:${item.externalItemId}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.externalItemId}</p>
                      {item.documentDateOriginal && (
                        <p className="text-xs text-gray-500 mt-1">
                          Fecha de documento: <strong>{new Date(item.documentDateOriginal).toLocaleDateString('es-ES')}</strong>
                        </p>
                      )}
                    </div>
                    {item.documentUrl && (
                      <a
                        href={item.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex flex-none items-center gap-1 text-sm text-[#00345E] hover:underline"
                      >
                        Ver documento <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
          {detail.items.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                La postulación no tiene documentos adjuntos.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          {detail.reviews.map((review, index) => (
            <Card key={index}>
              <CardContent className="flex items-start gap-4 pt-6">
                {review.decision === 'approved' ? (
                  <CheckCircle className="mt-1 h-6 w-6 flex-none text-green-600" />
                ) : (
                  <XCircle className="mt-1 h-6 w-6 flex-none text-red-600" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{REVIEW_STAGE_LABELS[review.stage]}</p>
                    <Badge variant="outline">
                      {review.decision === 'approved' ? 'Aprobada' : 'Rechazada'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Por {review.reviewerName} · {formatDateTime(review.createdAt)}
                  </p>
                  {review.feedback && (
                    <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">{review.feedback}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {detail.appeal && (
            <Card className="border-purple-200">
              <CardContent className="flex items-start gap-4 pt-6">
                <Scale className="mt-1 h-6 w-6 flex-none text-purple-600" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Apelación presentada por el docente</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(detail.appeal.submittedAt)}</p>
                  <p className="mt-2 rounded-lg bg-secondary p-3 text-sm">{detail.appeal.justification}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {detail.reviews.length === 0 && !detail.appeal && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Aún no hay revisiones registradas.
              </CardContent>
            </Card>
          )}
        </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Diálogo de decisión (TH / CP / CA) */}
      <Dialog open={decisionDialog !== null} onOpenChange={(open) => !open && setDecisionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decisionDialog === 'approved' ? 'Aprobar postulación' : 'Rechazar postulación'}
            </DialogTitle>
            <DialogDescription>
              {decisionDialog === 'approved'
                ? 'Confirme la aprobación de la documentación presentada. Se registrará su usuario y la fecha de la decisión.'
                : 'Ingrese la retroalimentación para el docente. Se registrará su usuario y la fecha de la decisión.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>
              Retroalimentación {decisionDialog === 'approved' ? '(opcional)' : '(obligatoria)'}
            </Label>
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              placeholder="Observaciones sobre la documentación presentada..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecisionDialog(null)} disabled={working}>
              Cancelar
            </Button>
            <Button
              onClick={() => void handleDecision()}
              disabled={working}
              className={decisionDialog === 'approved' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'}
            >
              {working ? 'Guardando...' : decisionDialog === 'approved' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de apelación (docente) */}
      <Dialog open={appealDialogOpen} onOpenChange={setAppealDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Presentar apelación</DialogTitle>
            <DialogDescription>
              Su apelación será revisada por la Comisión de Apelaciones. Explique las razones por las que
              considera que la decisión debe reconsiderarse.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Justificación</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={5}
              placeholder="Fundamente su apelación..."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppealDialogOpen(false)} disabled={working}>
              Cancelar
            </Button>
            <Button onClick={() => void handleAppeal()} disabled={working} className="bg-[#00345E]">
              {working ? 'Enviando...' : 'Presentar apelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
