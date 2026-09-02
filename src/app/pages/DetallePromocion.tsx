import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Calendar, Users, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { ProcessStatusBadge } from '../components/ApplicationStatusBadge';
import { EligibilityDashboard } from '../components/EligibilityDashboard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';
import { useAuth } from '../context/AuthContext';
import { fetchProcessDetail, fetchEligibility } from '../services/processes-service';
import { ApiError } from '../services/http-client';
import { formatDate } from '../utils/format';
import type { Eligibility, ProcessDetail, RequirementConfig } from '../types/api';

function requirementRows(config: RequirementConfig): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Experiencia mínima en el grado', value: `${config.minYearsInPosition} años` },
    { label: 'Publicaciones durante el grado', value: `${config.minPublications}` }
  ];

  if (config.minPublicationsInOtherLanguage > 0) {
    rows.push({ label: 'Publicaciones en otro idioma', value: `${config.minPublicationsInOtherLanguage}` });
  }

  rows.push(
    { label: 'Evaluación integral mínima', value: `${config.minEvaluationScorePct} %` },
    {
      label: `Horas de capacitación (últimos ${config.trainingWindowYears} años)`,
      value: `${config.minTrainingHours} horas`
    }
  );

  if (config.minPedagogicalTrainingPct != null) {
    rows.push({ label: 'Horas pedagógicas', value: `${config.minPedagogicalTrainingPct} % de las horas exigidas` });
  }
  if (config.minGivenTrainingHours != null) {
    rows.push({ label: 'Capacitación impartida', value: `${config.minGivenTrainingHours} horas` });
  }
  if (config.minProjectMonths != null) {
    const scope = config.projectRoleScope === 'direction' ? ' (dirección/codirección)' : '';
    const mult = config.applyRoleMultipliers ? ', con multiplicadores de coordinador' : '';
    rows.push({ label: 'Meses en proyectos', value: `${config.minProjectMonths} meses${scope}${mult}` });
  }
  if (config.minInternationalProjects != null) {
    rows.push({ label: 'Proyectos con redes extranjeras', value: `${config.minInternationalProjects}` });
  }
  if (config.minDoctoralTheses != null) {
    rows.push({ label: 'Tesis doctorales dirigidas', value: `${config.minDoctoralTheses}` });
  }
  if (config.minDoctoralThesesInRank != null) {
    rows.push({ label: 'Tesis dirigidas durante el grado', value: `${config.minDoctoralThesesInRank}` });
  }
  if (config.requiredLanguageLevel) {
    rows.push({ label: 'Idioma distinto al castellano', value: `Nivel ${config.requiredLanguageLevel} (MCER)` });
  }

  return rows;
}

export default function DetallePromocion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [process, setProcess] = useState<ProcessDetail | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.backendRole === 'teacher';

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        const detail = await fetchProcessDetail(id);
        setProcess(detail);

        if (user?.backendRole === 'teacher') {
          try {
            const sessionJson = window.localStorage.getItem('uta-promo-session');
            const session = sessionJson ? JSON.parse(sessionJson) : null;
            const externalAccessToken = session?.externalAccessToken;

            if (!externalAccessToken) {
              setEligibilityError('Token externo no disponible. Inicie sesión nuevamente.');
              return;
            }

            setEligibility(await fetchEligibility(id, externalAccessToken));
          } catch (error) {
            setEligibilityError(
              error instanceof ApiError ? error.message : 'No se pudo evaluar su elegibilidad.');
          }
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar el proceso.');
        navigate('/promociones');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, user?.backendRole, navigate]);

  if (loading || !process) {
    return <p className="py-8 text-center text-muted-foreground">Cargando proceso...</p>;
  }

  const { summary } = process;
  const canApply =
    isTeacher && summary.status === 'open' && !summary.hasApplied && eligibility?.isEligible === true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/promociones')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl">{summary.name}</h1>
              <ProcessStatusBadge status={summary.status} />
            </div>
            {summary.description && <p className="text-muted-foreground">{summary.description}</p>}
          </div>
        </div>
        {isTeacher && (
          <Button
            className="bg-[#00345E]"
            disabled={!canApply}
            onClick={() => navigate(`/promociones/${summary.id}/postular`)}
          >
            <Send className="mr-2 h-4 w-4" />
            {summary.hasApplied ? 'Ya postuló en este proceso' : 'Postular'}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Calendar className="h-8 w-8 text-[#00345E]" />
            <div>
              <p className="text-sm text-muted-foreground">Ventana de postulación</p>
              <p className="text-sm font-medium">
                {formatDate(summary.startDate)} — {formatDate(summary.endDate)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {isTeacher && eligibility && <EligibilityDashboard eligibility={eligibility} />}

      {isTeacher && eligibilityError && (
        <Alert>
          <AlertDescription>{eligibilityError}</AlertDescription>
        </Alert>
      )}

      {isTeacher && summary.hasApplied && (
        <Alert>
          <AlertDescription>
            Ya registró una postulación en este proceso. Puede revisar su estado en la sección Postulaciones.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Requisitos configurados por transición</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {process.requirements.map((config) => (
            <div key={config.fromPosition}>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant="secondary">
                  {config.fromPosition.replace('_', ' ')} → {config.toPosition.replace('_', ' ')}
                </Badge>
                {isTeacher && eligibility?.fromPosition === config.fromPosition && (
                  <Badge className="bg-[#C9982E] text-white hover:bg-[#C9982E]">Su transición</Badge>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Requisito</TableHead>
                    <TableHead>Valor exigido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirementRows(config).map((row) => (
                    <TableRow key={row.label}>
                      <TableCell>{row.label}</TableCell>
                      <TableCell className="font-medium">{row.value}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {config.notes && <p className="mt-2 text-xs text-muted-foreground">{config.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
