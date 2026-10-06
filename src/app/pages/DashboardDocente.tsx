import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CalendarDays, ClipboardList, FileSearch, IdCard, Send, UserRound, Award } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ApplicationStatusBadge, ProcessStatusBadge } from '../components/ApplicationStatusBadge';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { useSelectedProcess } from '../context/ProcessContext';
import { fetchApplicationDetail, fetchApplications } from '../services/applications-service';
import { useTeacherProfile } from '../hooks/useTeacherProfile';
import { buildTimeline, statusHeadline } from '../utils/application-timeline';
import { formatDate } from '../utils/format';
import type { ApplicationDetail } from '../types/api';

const TONE_CLASS = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  success: 'border-green-300 bg-green-50 text-green-900',
  danger: 'border-red-200 bg-red-50 text-red-900',
  warning: 'border-amber-300 bg-amber-50 text-amber-900'
} as const;

/** "Mi postulación": en qué proceso trabaja el docente, en qué estado está su solicitud y qué sigue. */
export default function DashboardDocente() {
  const navigate = useNavigate();
  const { selectedProcess } = useSelectedProcess();
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const profile = useTeacherProfile();

  const processId = selectedProcess?.id;

  useEffect(() => {
    if (!processId) return;

    setLoading(true);
    setDetail(null);
    fetchApplications(undefined, processId)
      .then(async (applications) => {
        const mine = applications[0];
        if (mine) {
          setDetail(await fetchApplicationDetail(mine.id));
        }
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar su postulación.'))
      .finally(() => setLoading(false));
  }, [processId]);

  if (!selectedProcess) {
    return null;
  }

  const isOpen = selectedProcess.status === 'open';
  const headline = detail ? statusHeadline(detail) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Mi postulación</h1>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-muted-foreground">
          <span className="font-medium text-foreground">{selectedProcess.name}</span>
          <ProcessStatusBadge status={selectedProcess.status} />
          <span className="flex items-center gap-1 text-sm">
            <CalendarDays className="h-4 w-4" />
            {formatDate(selectedProcess.startDate)} — {formatDate(selectedProcess.endDate)}
          </span>
        </div>
      </div>

      {profile && (
        <Card>
          <CardContent className="grid gap-4 py-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <UserRound className="h-5 w-5" />, label: 'Docente', value: profile.profile.fullName },
              { icon: <IdCard className="h-5 w-5" />, label: 'Cédula', value: profile.profile.identification },
              { icon: <Building2 className="h-5 w-5" />, label: 'Facultad', value: profile.profile.dependency?.name || '—' },
              {
                icon: <Award className="h-5 w-5" />,
                label: 'Posición actual',
                value: profile.currentPositionLabel,
                hint: profile.profile.currentPositionStartDate
                  ? `Desde ${formatDate(profile.profile.currentPositionStartDate)}`
                  : undefined
              }
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className="mt-0.5 rounded-lg bg-secondary p-2 text-[#00345E]">{item.icon}</span>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="font-medium leading-snug">{item.value}</p>
                  {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Cargando su postulación...</p>
      ) : !detail ? (
        <Card>
          <CardContent className="space-y-4 py-8">
            <div className="flex items-start gap-3">
              <ClipboardList className="mt-0.5 h-6 w-6 text-[#00345E]" />
              <div>
                <p className="text-lg font-medium">Aún no ha postulado a este proceso</p>
                <p className="text-sm text-muted-foreground">
                  {isOpen
                    ? `El proceso está abierto hasta el ${formatDate(selectedProcess.endDate)}. Revise sus requisitos y, si los cumple, envíe su solicitud.`
                    : selectedProcess.status === 'scheduled'
                      ? `El proceso abrirá el ${formatDate(selectedProcess.startDate)}.`
                      : 'El proceso está cerrado: ya no se reciben postulaciones.'}
                </p>
                {selectedProcess.myTransition && (
                  <p className="mt-1 text-sm">
                    Su transición: <span className="font-medium">{selectedProcess.myTransition.fromLabel}</span> →{' '}
                    <span className="font-medium">{selectedProcess.myTransition.toLabel}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => navigate(`/promociones/${selectedProcess.id}`)}>
                <FileSearch className="mr-2 h-4 w-4" />
                Ver requisitos y mi elegibilidad
              </Button>
              {isOpen && (
                <Button className="bg-[#00345E] hover:bg-[#002A4B]" onClick={() => navigate(`/promociones/${selectedProcess.id}/postular`)}>
                  <Send className="mr-2 h-4 w-4" />
                  Postular
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {headline && (
            <Card className={TONE_CLASS[headline.tone]}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                <div className="space-y-2">
                  <ApplicationStatusBadge status={detail.summary.status} />
                  <p className="text-base font-medium">{headline.text}</p>
                  <p className="text-sm opacity-80">
                    {detail.summary.fromLabel} → {detail.summary.toLabel}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {detail.canAppeal && (
                    <Button className="bg-amber-600 hover:bg-amber-700" onClick={() => navigate(`/postulaciones/${detail.summary.id}`)}>
                      Apelar ahora
                    </Button>
                  )}
                  <Button variant="outline" className="bg-white" onClick={() => navigate(`/postulaciones/${detail.summary.id}`)}>
                    Ver detalle
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Seguimiento de su solicitud</CardTitle>
            </CardHeader>
            <CardContent>
              <ApplicationTimeline steps={buildTimeline(detail)} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
