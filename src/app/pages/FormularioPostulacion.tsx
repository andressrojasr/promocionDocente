import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { ArrowLeft, Send, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Alert, AlertDescription } from '../components/ui/alert';
import { useAuth } from '../context/AuthContext';
import { fetchEligibility } from '../services/processes-service';
import { fetchMyProfile } from '../services/teacher-service';
import { submitApplication } from '../services/applications-service';
import { ApiError } from '../services/http-client';
import { ITEM_TYPE_LABELS, formatDate } from '../utils/format';
import type {
  ApplicationItemPayload,
  ApplicationItemType,
  Eligibility,
  TeacherProfileData
} from '../types/api';

interface SelectableItem {
  itemType: ApplicationItemType;
  externalItemId: string;
  title: string;
  subtitle: string;
  documentUrl: string | null;
}

/** Mapea requisitos a tipos de items requeridos con mínimos. */
interface RequirementMap {
  itemType: ApplicationItemType;
  label: string;
  requiredCount: number | null;
  requirementCode: string;
}

function getRequiredItemTypes(eligibility: Eligibility): RequirementMap[] {
  const required: RequirementMap[] = [];
  const seen = new Set<string>();

  eligibility.requirements.forEach((req) => {
    let itemType: ApplicationItemType | null = null;

    // Mapeo de código de requisito a tipo de item (códigos exactos del backend)
    switch (req.code) {
      case 'YEARS_IN_RANK':
        itemType = 'experience';
        break;
      case 'PUBLICATIONS':
      case 'PUBLICATIONS_OTHER_LANGUAGE':
        itemType = 'publication';
        break;
      case 'EVALUATION_SCORE':
        // No requiere item específico
        break;
      case 'TRAINING_HOURS':
      case 'PEDAGOGICAL_HOURS':
        itemType = 'received_training';
        break;
      case 'GIVEN_TRAINING_HOURS':
        itemType = 'given_training';
        break;
      case 'PROJECT_MONTHS':
      case 'INTERNATIONAL_PROJECTS':
        itemType = 'research_project';
        break;
      case 'DOCTORAL_THESES':
      case 'THESES_IN_RANK':
        itemType = 'doctoral_thesis';
        break;
      case 'LANGUAGE_LEVEL':
        itemType = 'language';
        break;
    }

    // Para TRAINING_HOURS y PEDAGOGICAL_HOURS, incluir ambos incluso si mapean al mismo itemType
    const uniqueKey = req.code === 'PEDAGOGICAL_HOURS' || req.code === 'TRAINING_HOURS'
      ? req.code
      : itemType;

    if (itemType && !seen.has(uniqueKey)) {
      seen.add(uniqueKey);
      required.push({
        itemType,
        label: req.label,
        requiredCount: req.requiredNumeric,
        requirementCode: req.code
      });
    }
  });

  return required;
}

/** Determina qué tipos de items son permitidos basado en los requisitos del proceso. */
function getAllowedItemTypes(eligibility: Eligibility): Set<ApplicationItemType> {
  const required = getRequiredItemTypes(eligibility);
  return new Set(required.map((r) => r.itemType));
}

/** Aplana la hoja de vida en ítems seleccionables agrupados por categoría. */
function buildSelectableItems(profile: TeacherProfileData): Record<ApplicationItemType, SelectableItem[]> {
  const hr = profile.profile;

  return {
    publication: hr.publications.map((p) => ({
      itemType: 'publication',
      externalItemId: p.id,
      title: p.name,
      subtitle: `${p.journal} · ${formatDate(p.publicationDate)} · ${p.indexingDatabase} · ${p.language}`,
      documentUrl: p.supportingDocumentUrl || null
    })),
    received_training: hr.receivedTrainings.map((t) => ({
      itemType: 'received_training',
      externalItemId: t.id,
      title: t.name,
      subtitle: `${t.institution} · ${t.hours} horas · ${t.trainingCategory === 'PEDAGOGICAL' ? 'Pedagógica' : 'Disciplinar'}`,
      documentUrl: t.supportingDocumentUrl || null
    })),
    given_training: hr.givenTrainings.map((t) => ({
      itemType: 'given_training',
      externalItemId: t.id,
      title: t.name,
      subtitle: `${t.institution} · ${t.hours} horas`,
      documentUrl: t.supportingDocumentUrl || null
    })),
    research_project: hr.researchProjects.map((p) => ({
      itemType: 'research_project',
      externalItemId: p.id,
      title: p.name,
      subtitle: `${p.role} · ${formatDate(p.startDate)} — ${formatDate(p.endDate)} · ${p.months} meses`,
      documentUrl: p.supportingDocumentUrl || null
    })),
    doctoral_thesis: hr.doctoralTheses.map((t) => ({
      itemType: 'doctoral_thesis',
      externalItemId: t.id,
      title: t.title,
      subtitle: `${t.role} · Aprobada el ${formatDate(t.approvalDate)}`,
      documentUrl: t.supportingDocumentUrl || null
    })),
    language: hr.languages.map((l) => ({
      itemType: 'language',
      externalItemId: l.id,
      title: `${l.language} - Nivel ${l.level}`,
      subtitle: `${l.certifyingInstitution} · Vigente hasta ${formatDate(l.expirationDate)}`,
      documentUrl: l.supportingDocumentUrl || null
    })),
    experience: hr.experience.map((e) => ({
      itemType: 'experience',
      externalItemId: e.id,
      title: `${e.position} - ${e.institution}`,
      subtitle: `${formatDate(e.startDate)} — ${e.endDate ? formatDate(e.endDate) : 'Actualidad'}`,
      documentUrl: e.supportingDocumentUrl || null
    }))
  };
}

/** Valida si un item cumple los requisitos del proceso */
function isValidItem(
  item: SelectableItem,
  profile: TeacherProfileData,
  config: RequirementConfigForApplication | null | undefined
): boolean {
  if (!config) return true;

  const today = new Date();
  const rankStartDate = new Date(profile.profile.currentPositionStartDate);
  const windowStart = new Date(today);
  windowStart.setFullYear(windowStart.getFullYear() - config.trainingWindowYears);

  switch (item.itemType) {
    case 'publication': {
      // Publicación debe estar dentro del rango de años en el grado y estar publicada
      const pub = profile.profile.publications.find((p) => p.id === item.externalItemId);
      if (!pub) return false;
      const pubDate = new Date(pub.publicationDate);
      return (
        pub.status === 'PUBLISHED' &&
        pubDate >= rankStartDate &&
        pubDate <= today
      );
    }

    case 'received_training': {
      // Capacitación debe estar dentro de la ventana de años
      const training = profile.profile.receivedTrainings.find((t) => t.id === item.externalItemId);
      if (!training) return false;
      const trainDate = new Date(training.endDate || training.startDate);
      return trainDate >= windowStart && trainDate <= today;
    }

    case 'given_training': {
      // Capacitación impartida debe estar dentro de la ventana de años
      const training = profile.profile.givenTrainings.find((t) => t.id === item.externalItemId);
      if (!training) return false;
      const trainDate = new Date(training.endDate || training.startDate);
      return trainDate >= windowStart && trainDate <= today;
    }

    case 'research_project': {
      // Proyecto debe estar dentro del rango de años en el grado
      const project = profile.profile.researchProjects.find((p) => p.id === item.externalItemId);
      if (!project) return false;
      const projStartDate = new Date(project.startDate);
      const projEndDate = new Date(project.endDate);
      return projStartDate >= rankStartDate && projEndDate <= today;
    }

    case 'doctoral_thesis': {
      // Tesis debe estar dirigida/codirigida
      const thesis = profile.profile.doctoralTheses.find((t) => t.id === item.externalItemId);
      if (!thesis) return false;
      const directionRoles = ['DIRECTOR', 'CO_DIRECTOR'];
      return directionRoles.includes(thesis.role.toUpperCase());
    }

    case 'language': {
      // Idioma debe tener certificación vigente
      const lang = profile.profile.languages.find((l) => l.id === item.externalItemId);
      if (!lang) return false;
      const expDate = new Date(lang.expirationDate);
      return expDate >= today;
    }

    case 'experience': {
      // Solo experiencia en el grado actual es válida
      const exp = profile.profile.experience.find((e) => e.id === item.externalItemId);
      if (!exp) return false;
      const expEndDate = exp.endDate ? new Date(exp.endDate) : today;
      return expEndDate >= rankStartDate;
    }

    default:
      return true;
  }
}

export default function FormularioPostulacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || user?.backendRole !== 'teacher') return;

    const sessionJson = window.localStorage.getItem('uta-promo-session');
    const session = sessionJson ? JSON.parse(sessionJson) : null;
    const externalAccessToken = session?.externalAccessToken;

    if (!externalAccessToken) {
      setError('Token externo no disponible. Inicie sesión nuevamente.');
      setLoading(false);
      return;
    }

    Promise.all([fetchMyProfile(externalAccessToken), fetchEligibility(id, externalAccessToken)])
      .then(([profileData, eligibilityData]) => {
        setProfile(profileData);
        setEligibility(eligibilityData);
      })
      .catch((err: unknown) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la información de postulación.'))
      .finally(() => setLoading(false));
  }, [id, user?.backendRole]);

  const itemsByCategory = useMemo(
    () => (profile ? buildSelectableItems(profile) : null),
    [profile]
  );

  const keyOf = (item: SelectableItem) => `${item.itemType}:${item.externalItemId}`;

  const toggleItem = (item: SelectableItem) => {
    setSelected((current) => {
      const next = new Set(current);
      const key = keyOf(item);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!id) return;

    const sessionJson = window.localStorage.getItem('uta-promo-session');
    const session = sessionJson ? JSON.parse(sessionJson) : null;
    const externalAccessToken = session?.externalAccessToken;

    if (!externalAccessToken) {
      toast.error('Token externo no disponible. Inicie sesión nuevamente.');
      return;
    }

    const items: ApplicationItemPayload[] = [...selected].map((key) => {
      const [itemType, externalItemId] = key.split(':');
      return { itemType: itemType as ApplicationItemType, externalItemId };
    });

    if (items.length === 0) {
      toast.error('Seleccione al menos un documento de respaldo para su postulación.');
      return;
    }

    try {
      setSubmitting(true);
      await submitApplication(id, items, externalAccessToken);
      toast.success('Postulación enviada correctamente. Talento Humano revisará su documentación.');
      navigate('/postulaciones');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo enviar la postulación.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Cargando información...</p>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(`/promociones/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al proceso
        </Button>
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!eligibility?.isEligible) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(`/promociones/${id}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al proceso
        </Button>
        <Alert>
          <AlertDescription>
            No cumple todos los requisitos de este proceso, por lo que no es posible postular.
            Revise el dashboard de requisitos en el detalle del proceso.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const allowedTypes = eligibility ? getAllowedItemTypes(eligibility) : new Set();
  const requiredTypes = eligibility ? getRequiredItemTypes(eligibility) : [];

  const categories = (Object.keys(ITEM_TYPE_LABELS) as ApplicationItemType[])
    .filter((category) => allowedTypes.has(category) && (itemsByCategory?.[category].length ?? 0) > 0);

  // Calcula la cantidad según el tipo de requisito (sumar años/horas/meses o contar items)
  function getQuantityForRequirement(
    itemType: ApplicationItemType,
    items: SelectableItem[],
    selectedKeys: Set<string>,
    requirementCode?: string
  ): { selected: number; total: number } {
    const validItems = profile
      ? items.filter((item) => isValidItem(item, profile, eligibility?.requirementConfig))
      : items;

    const selectedItems = validItems.filter((item) => selectedKeys.has(keyOf(item)));

    // Para experiencia, sumar años
    if (itemType === 'experience' && profile) {
      const selectedYears = selectedItems.reduce((sum, item) => {
        const exp = profile.profile.experience.find((e) => e.id === item.externalItemId);
        return sum + (exp?.years ?? 0) + (exp?.months ?? 0) / 12;
      }, 0);

      const totalYears = validItems.reduce((sum, item) => {
        const exp = profile.profile.experience.find((e) => e.id === item.externalItemId);
        return sum + (exp?.years ?? 0) + (exp?.months ?? 0) / 12;
      }, 0);

      return { selected: Math.round(selectedYears * 10) / 10, total: Math.round(totalYears * 10) / 10 };
    }

    // Para capacitaciones recibidas, sumar horas (con filtro de pedagógicas si es necesario)
    if (itemType === 'received_training' && profile) {
      const isPedagogicalOnly = requirementCode === 'PEDAGOGICAL_HOURS';

      const selectedHours = selectedItems.reduce((sum, item) => {
        const training = profile.profile.receivedTrainings.find((t) => t.id === item.externalItemId);
        if (isPedagogicalOnly && training?.trainingCategory !== 'PEDAGOGICAL') return sum;
        return sum + (training?.hours ?? 0);
      }, 0);

      const totalHours = validItems.reduce((sum, item) => {
        const training = profile.profile.receivedTrainings.find((t) => t.id === item.externalItemId);
        if (isPedagogicalOnly && training?.trainingCategory !== 'PEDAGOGICAL') return sum;
        return sum + (training?.hours ?? 0);
      }, 0);

      return { selected: selectedHours, total: totalHours };
    }

    // Para capacitaciones impartidas, sumar horas
    if (itemType === 'given_training' && profile) {
      const selectedHours = selectedItems.reduce((sum, item) => {
        const training = profile.profile.givenTrainings.find((t) => t.id === item.externalItemId);
        return sum + (training?.hours ?? 0);
      }, 0);

      const totalHours = validItems.reduce((sum, item) => {
        const training = profile.profile.givenTrainings.find((t) => t.id === item.externalItemId);
        return sum + (training?.hours ?? 0);
      }, 0);

      return { selected: selectedHours, total: totalHours };
    }

    // Para proyectos de investigación, sumar meses
    if (itemType === 'research_project' && profile) {
      const selectedMonths = selectedItems.reduce((sum, item) => {
        const project = profile.profile.researchProjects.find((p) => p.id === item.externalItemId);
        return sum + (project?.months ?? 0);
      }, 0);

      const totalMonths = validItems.reduce((sum, item) => {
        const project = profile.profile.researchProjects.find((p) => p.id === item.externalItemId);
        return sum + (project?.months ?? 0);
      }, 0);

      return { selected: selectedMonths, total: totalMonths };
    }

    // Para otros tipos (publicaciones, idiomas, tesis), contar items
    return { selected: selectedItems.length, total: validItems.length };
  }

  // Validar que todos los requisitos cumplan con el número mínimo requerido
  const requirementProgress = requiredTypes.map((req) => {
    const itemsInCategory = itemsByCategory?.[req.itemType] ?? [];
    const { selected: selectedCount, total: totalCount } = getQuantityForRequirement(
      req.itemType,
      itemsInCategory,
      selected,
      req.requirementCode
    );
    const minRequired = req.requiredCount ?? 1;

    return {
      requirement: req,
      selected: selectedCount,
      required: minRequired,
      isMet: selectedCount >= minRequired,
      label: req.label,
      totalValid: totalCount
    };
  });

  const unfulfilledRequirements = requirementProgress.filter((p) => !p.isMet);
  const canSubmit = selected.size > 0 && unfulfilledRequirements.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/promociones/${id}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl">Formulario de Postulación</h1>
          <p className="text-muted-foreground">
            Transición {eligibility.fromLabel} → {eligibility.toLabel}. Seleccione los documentos de su hoja
            de vida que respaldan su postulación.
          </p>
        </div>
      </div>

      <Alert>
        <AlertDescription>
          Cumple todos los requisitos del proceso. La selección de documentos inicia vacía: agregue las
          evidencias que desea presentar (publicaciones, capacitaciones, proyectos, tesis, idiomas y experiencia).
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel Izquierdo - Requisitos - Sticky */}
        <div className="lg:col-span-1 sticky top-0 h-fit">
          <h2 className="text-sm font-semibold mb-4 text-gray-900">Requisitos</h2>
          <div className="space-y-3">
            {requirementProgress.map((req) => (
              <div
                key={req.requirement.requirementCode}
                className={`border rounded-lg p-3 transition-all ${
                  req.isMet
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-medium text-gray-600`}>
                    {req.label}
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      req.isMet
                        ? 'bg-green-200 text-green-800'
                        : 'bg-red-200 text-red-800'
                    }`}
                  >
                    {req.selected}/{req.required}
                  </span>
                </div>
                <p className={`text-xs ${req.isMet ? 'text-green-600' : 'text-red-600'}`}>
                  válidos: {req.totalValid}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Panel Derecho - Items */}
        <div className="lg:col-span-3 space-y-6">
          {categories.map((category) => {
            const items = itemsByCategory?.[category] ?? [];
            const requirementForCategory = requirementProgress.find((p) => p.requirement.itemType === category);
            const minRequired = requirementForCategory?.required ?? 1;
            const selectedInCategory = requirementForCategory?.selected ?? 0;
            const totalValid = requirementForCategory?.totalValid ?? 0;
            const isMet = selectedInCategory >= minRequired;

            // Filtrar items válidos
            const validItems = profile
              ? items.filter((item) => isValidItem(item, profile, eligibility?.requirementConfig))
              : items;

            return (
              <Card key={category}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{ITEM_TYPE_LABELS[category]}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={
                          isMet
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }
                      >
                        {selectedInCategory}/{minRequired} (válidos: {totalValid})
                      </Badge>
                      {isMet && <span className="text-green-600 text-lg">✓</span>}
                    </div>
                  </div>
                  <CardDescription>
                    {requirementForCategory?.label || 'Marque los elementos que desea adjuntar como respaldo.'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.map((item) => {
                    const isSelected = selected.has(keyOf(item));
                    const isValid = validItems.includes(item);
                    const isDisabled = !isValid;

                    return (
                      <label
                        key={keyOf(item)}
                        className={
                          'flex items-start gap-3 rounded-lg border p-3 transition-colors ' +
                          (isDisabled
                            ? 'cursor-not-allowed bg-gray-50 opacity-50'
                            : 'cursor-pointer ' +
                              (isSelected ? 'border-[#00345E] bg-blue-50/50' : 'hover:bg-secondary/50'))
                        }
                        title={isDisabled ? 'Este elemento no cumple los requisitos de fecha/estado' : ''}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => !isDisabled && toggleItem(item)}
                          disabled={isDisabled}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                        </div>
                        {item.documentUrl && (
                          <a
                            href={item.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-[#00345E] hover:underline"
                          >
                            Documento <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </label>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-white p-4">
        <p className="text-sm text-muted-foreground">
          {selected.size} documento{selected.size === 1 ? '' : 's'} seleccionado{selected.size === 1 ? '' : 's'}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(`/promociones/${id}`)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={submitting || !canSubmit}
            className="bg-[#00345E]"
            title={
              unfulfilledRequirements.length > 0
                ? `Falta: ${unfulfilledRequirements
                    .map((r) => `${r.label} (${r.selected}/${r.required})`)
                    .join('; ')}`
                : ''
            }
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Enviando...' : 'Enviar postulación'}
          </Button>
        </div>
      </div>
    </div>
  );
}
