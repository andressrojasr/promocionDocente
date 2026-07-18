import { useEffect, useState } from 'react';
import { ExternalLink, GraduationCap, BookOpen, Briefcase, Languages, FlaskConical, School } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useAuth } from '../context/AuthContext';
import { fetchMyProfile } from '../services/teacher-service';
import { formatDate, formatDateTime } from '../utils/format';
import type { TeacherProfileData } from '../types/api';

function DocumentLink({ url }: { url: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex flex-none items-center gap-1 text-sm text-[#00345E] hover:underline"
    >
      Documento <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

function ItemRow({ title, subtitle, url }: { title: string; subtitle: string; url?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <DocumentLink url={url} />
    </div>
  );
}

export default function PerfilDocente() {
  const { user } = useAuth();
  const [data, setData] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const isTeacher = user?.backendRole === 'teacher';

  useEffect(() => {
    if (!isTeacher) {
      setLoading(false);
      return;
    }
    fetchMyProfile()
      .then(setData)
      .catch((error: unknown) =>
        toast.error(error instanceof Error ? error.message : 'No se pudo cargar su hoja de vida.'))
      .finally(() => setLoading(false));
  }, [isTeacher]);

  if (!isTeacher) {
    return (
      <Alert>
        <AlertDescription>
          La hoja de vida está disponible solo para docentes. Su cuenta tiene el rol{' '}
          {user?.rol.replace('_', ' ')}.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Cargando hoja de vida...</p>;
  }

  if (!data) {
    return (
      <Alert>
        <AlertDescription>No se encontró su hoja de vida. Inicie sesión nuevamente.</AlertDescription>
      </Alert>
    );
  }

  const hr = data.profile;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Perfil del Docente</h1>
        <p className="text-muted-foreground">
          Información sincronizada desde el sistema de RRHH el {formatDateTime(data.capturedAt)}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{hr.fullName}</CardTitle>
            <div className="flex gap-2">
              <Badge className="bg-[#00345E] hover:bg-[#00345E]">{data.currentPositionLabel}</Badge>
              {data.nextPositionLabel ? (
                <Badge variant="secondary">Siguiente: {data.nextPositionLabel}</Badge>
              ) : (
                <Badge variant="secondary">Sin transición disponible</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground">Identificación</p>
            <p className="font-medium">{hr.identification}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ORCID</p>
            <p className="font-medium">{hr.orcid || '—'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Dependencia</p>
            <p className="font-medium">{hr.dependency.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">En el grado actual desde</p>
            <p className="font-medium">{formatDate(hr.currentPositionStartDate)}</p>
          </div>
          {hr.score && (
            <div>
              <p className="text-muted-foreground">Evaluación integral ({hr.score.period})</p>
              <p className="font-medium">{hr.score.percentage} %</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="publicaciones">
        <TabsList className="flex-wrap">
          <TabsTrigger value="publicaciones">
            <BookOpen className="mr-1 h-4 w-4" /> Publicaciones ({hr.publications.length})
          </TabsTrigger>
          <TabsTrigger value="capacitaciones">
            <School className="mr-1 h-4 w-4" /> Capacitaciones ({hr.receivedTrainings.length + hr.givenTrainings.length})
          </TabsTrigger>
          <TabsTrigger value="proyectos">
            <FlaskConical className="mr-1 h-4 w-4" /> Proyectos ({hr.researchProjects.length})
          </TabsTrigger>
          <TabsTrigger value="tesis">
            <GraduationCap className="mr-1 h-4 w-4" /> Tesis ({hr.doctoralTheses.length})
          </TabsTrigger>
          <TabsTrigger value="idiomas">
            <Languages className="mr-1 h-4 w-4" /> Idiomas ({hr.languages.length})
          </TabsTrigger>
          <TabsTrigger value="experiencia">
            <Briefcase className="mr-1 h-4 w-4" /> Experiencia ({hr.experience.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="publicaciones" className="space-y-2">
          {hr.publications.map((p) => (
            <ItemRow
              key={p.id}
              title={p.name}
              subtitle={`${p.journal} · ${formatDate(p.publicationDate)} · ${p.indexingDatabase} · Idioma ${p.language} · ${p.status}`}
              url={p.supportingDocumentUrl}
            />
          ))}
        </TabsContent>

        <TabsContent value="capacitaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recibidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hr.receivedTrainings.map((t) => (
                <ItemRow
                  key={t.id}
                  title={t.name}
                  subtitle={`${t.institution} · ${t.hours} horas · ${t.trainingCategory === 'PEDAGOGICAL' ? 'Pedagógica' : 'Disciplinar'} · ${formatDate(t.endDate)}`}
                  url={t.supportingDocumentUrl}
                />
              ))}
              {hr.receivedTrainings.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin capacitaciones recibidas.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Impartidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {hr.givenTrainings.map((t) => (
                <ItemRow
                  key={t.id}
                  title={t.name}
                  subtitle={`${t.institution} · ${t.hours} horas · ${formatDate(t.endDate)}`}
                  url={t.supportingDocumentUrl}
                />
              ))}
              {hr.givenTrainings.length === 0 && (
                <p className="text-sm text-muted-foreground">Sin capacitaciones impartidas.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="proyectos" className="space-y-2">
          {hr.researchProjects.map((p) => (
            <ItemRow
              key={p.id}
              title={p.name}
              subtitle={`${p.role} · ${formatDate(p.startDate)} — ${formatDate(p.endDate)} · ${p.months} meses · ${p.country}`}
              url={p.supportingDocumentUrl}
            />
          ))}
          {hr.researchProjects.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin proyectos registrados.</p>
          )}
        </TabsContent>

        <TabsContent value="tesis" className="space-y-2">
          {hr.doctoralTheses.map((t) => (
            <ItemRow
              key={t.id}
              title={t.title}
              subtitle={`${t.role} · ${t.institution} · Aprobada el ${formatDate(t.approvalDate)}`}
              url={t.supportingDocumentUrl}
            />
          ))}
          {hr.doctoralTheses.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">Sin tesis doctorales dirigidas.</p>
          )}
        </TabsContent>

        <TabsContent value="idiomas" className="space-y-2">
          {hr.languages.map((l) => (
            <ItemRow
              key={l.id}
              title={`${l.language} - Nivel ${l.level} (${l.referenceFramework})`}
              subtitle={`${l.certifyingInstitution} · Vigente hasta ${formatDate(l.expirationDate)}`}
              url={l.supportingDocumentUrl}
            />
          ))}
        </TabsContent>

        <TabsContent value="experiencia" className="space-y-2">
          {hr.experience.map((e) => (
            <ItemRow
              key={e.id}
              title={`${e.position} - ${e.institution}`}
              subtitle={`${e.category} · ${formatDate(e.startDate)} — ${e.endDate ? formatDate(e.endDate) : 'Actualidad'}`}
              url={e.supportingDocumentUrl}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
