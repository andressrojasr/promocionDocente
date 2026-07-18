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

    Promise.all([fetchMyProfile(), fetchEligibility(id)])
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
      await submitApplication(id, items);
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

  const categories = (Object.keys(ITEM_TYPE_LABELS) as ApplicationItemType[])
    .filter((category) => (itemsByCategory?.[category].length ?? 0) > 0);

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

      {categories.map((category) => {
        const items = itemsByCategory?.[category] ?? [];
        const selectedInCategory = items.filter((item) => selected.has(keyOf(item))).length;

        return (
          <Card key={category}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{ITEM_TYPE_LABELS[category]}</CardTitle>
                <Badge variant="secondary">
                  {selectedInCategory}/{items.length} seleccionados
                </Badge>
              </div>
              <CardDescription>Marque los elementos que desea adjuntar como respaldo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.map((item) => {
                const isSelected = selected.has(keyOf(item));
                return (
                  <label
                    key={keyOf(item)}
                    className={
                      'flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ' +
                      (isSelected ? 'border-[#00345E] bg-blue-50/50' : 'hover:bg-secondary/50')
                    }
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleItem(item)}
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
            disabled={submitting || selected.size === 0}
            className="bg-[#00345E]"
          >
            <Send className="mr-2 h-4 w-4" />
            {submitting ? 'Enviando...' : 'Enviar postulación'}
          </Button>
        </div>
      </div>
    </div>
  );
}
