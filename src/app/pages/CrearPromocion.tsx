import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { cn } from '../components/ui/utils';
import { createProcess, fetchRequirementDefaults } from '../services/processes-service';
import type { RequirementConfig } from '../types/api';

const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const NO_LANGUAGE = 'none';

/**
 * Campo numérico controlado que admite valores opcionales (nulos).
 */
function NumberField({
  label,
  value,
  onChange,
  optional = false
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value ?? ''}
        placeholder={optional ? 'No aplica' : undefined}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(optional ? null : 0);
          } else {
            const parsed = Number(raw);
            onChange(Number.isNaN(parsed) ? null : parsed);
          }
        }}
      />
    </div>
  );
}

function TransitionEditor({
  config,
  onChange
}: {
  config: RequirementConfig;
  onChange: (next: RequirementConfig) => void;
}) {
  const set = <K extends keyof RequirementConfig>(key: K, value: RequirementConfig[K]) =>
    onChange({ ...config, [key]: value });

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <NumberField
        label="Años mínimos en el grado"
        value={config.minYearsInPosition}
        onChange={(v) => set('minYearsInPosition', v ?? 0)}
      />
      <NumberField
        label="Publicaciones mínimas (durante el grado)"
        value={config.minPublications}
        onChange={(v) => set('minPublications', v ?? 0)}
      />
      <NumberField
        label="Publicaciones en otro idioma"
        value={config.minPublicationsInOtherLanguage}
        onChange={(v) => set('minPublicationsInOtherLanguage', v ?? 0)}
      />
      <NumberField
        label="Puntaje mínimo evaluación (%)"
        value={config.minEvaluationScorePct}
        onChange={(v) => set('minEvaluationScorePct', v ?? 0)}
      />
      <NumberField
        label="Horas de capacitación recibida"
        value={config.minTrainingHours}
        onChange={(v) => set('minTrainingHours', v ?? 0)}
      />
      <NumberField
        label="% de horas pedagógicas"
        value={config.minPedagogicalTrainingPct}
        onChange={(v) => set('minPedagogicalTrainingPct', v)}
        optional
      />
      <NumberField
        label="Horas de capacitación impartida"
        value={config.minGivenTrainingHours}
        onChange={(v) => set('minGivenTrainingHours', v)}
        optional
      />
      <NumberField
        label="Meses en proyectos"
        value={config.minProjectMonths}
        onChange={(v) => set('minProjectMonths', v)}
        optional
      />
      <NumberField
        label="Proyectos internacionales"
        value={config.minInternationalProjects}
        onChange={(v) => set('minInternationalProjects', v)}
        optional
      />
      <NumberField
        label="Tesis doctorales dirigidas"
        value={config.minDoctoralTheses}
        onChange={(v) => set('minDoctoralTheses', v)}
        optional
      />
      <NumberField
        label="Tesis dirigidas durante el grado"
        value={config.minDoctoralThesesInRank}
        onChange={(v) => set('minDoctoralThesesInRank', v)}
        optional
      />
      <div className="space-y-1.5">
        <Label className="text-xs">Nivel de idioma (MCER)</Label>
        <Select
          value={config.requiredLanguageLevel ?? NO_LANGUAGE}
          onValueChange={(value) =>
            set('requiredLanguageLevel', value === NO_LANGUAGE ? null : value)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LANGUAGE}>Sin requisito</SelectItem>
            {LANGUAGE_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Roles de proyecto que cuentan</Label>
        <Select
          value={config.projectRoleScope}
          onValueChange={(value) => set('projectRoleScope', value as 'any' | 'direction')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Cualquier participación</SelectItem>
            <SelectItem value="direction">Solo dirección / codirección</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-end pb-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={config.applyRoleMultipliers}
            onCheckedChange={(checked) => set('applyRoleMultipliers', checked === true)}
          />
          Multiplicadores de coordinador (x2 principal, x1.5 subrogante)
        </label>
      </div>
      {config.notes && (
        <div className="md:col-span-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <Info className="mt-0.5 h-4 w-4 flex-none" />
          {config.notes}
        </div>
      )}
    </div>
  );
}

export default function CrearPromocion() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [requirements, setRequirements] = useState<RequirementConfig[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRequirementDefaults()
      .then((defaults) => {
        setRequirements(defaults);
        setExpanded(defaults[0]?.fromPosition ?? null);
      })
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudieron cargar los requisitos por defecto.'))
      .finally(() => setLoading(false));
  }, []);

  const updateRequirement = (fromPosition: string, next: RequirementConfig) => {
    setRequirements((current) =>
      current.map((r) => (r.fromPosition === fromPosition ? next : r)));
  };

  const transitionLabel = (config: RequirementConfig) =>
    `${config.fromPosition.replace('_', ' ')} → ${config.toPosition.replace('_', ' ')}`;

  const handleSubmit = async () => {
    if (!nombre.trim()) {
      toast.error('Ingrese el nombre del proceso.');
      return;
    }
    if (!fechaInicio || !fechaCierre) {
      toast.error('Ingrese las fechas de inicio y cierre de la ventana de postulación.');
      return;
    }
    if (new Date(fechaCierre) <= new Date(fechaInicio)) {
      toast.error('La fecha de cierre debe ser posterior a la fecha de inicio.');
      return;
    }

    try {
      setSaving(true);
      const process = await createProcess({
        name: nombre.trim(),
        description: descripcion.trim() || null,
        startDate: new Date(fechaInicio).toISOString(),
        endDate: new Date(`${fechaCierre}T23:59:59`).toISOString(),
        requirements
      });
      toast.success('Proceso de promoción creado correctamente.');
      navigate(`/promociones/${process.summary.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo crear el proceso.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/promociones')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl">Crear Proceso de Promoción</h1>
          <p className="text-muted-foreground">
            Los requisitos se pre-llenan con los valores del reglamento de escalafón y pueden ajustarse por transición.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del proceso</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Nombre del proceso</Label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="p. ej. Proceso de Promoción Docente 2026-I"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripción u observaciones del proceso (opcional)"
              rows={3}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Inicio de postulaciones</Label>
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Cierre de postulaciones</Label>
            <Input type="date" value={fechaCierre} onChange={(e) => setFechaCierre(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Requisitos por transición del escalafón</CardTitle>
          <p className="text-sm text-muted-foreground">
            No existe transición de Agregado 3 a Principal 1 según el reglamento.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <p className="py-6 text-center text-muted-foreground">Cargando requisitos por defecto...</p>
          ) : (
            requirements.map((config) => {
              const isOpen = expanded === config.fromPosition;
              return (
                <div key={config.fromPosition} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : config.fromPosition)}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium transition-colors hover:bg-secondary',
                      isOpen && 'border-b bg-secondary/60'
                    )}
                  >
                    {transitionLabel(config)}
                    {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {isOpen && (
                    <div className="p-4">
                      <TransitionEditor
                        config={config}
                        onChange={(next) => updateRequirement(config.fromPosition, next)}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/promociones')} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={saving || loading} className="bg-[#00345E]">
          {saving ? 'Creando proceso...' : 'Crear proceso'}
        </Button>
      </div>
    </div>
  );
}
