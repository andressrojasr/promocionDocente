import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { FileText, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { EligibilityDashboard } from '../components/EligibilityDashboard';
import { useAuth } from '../context/AuthContext';
import { fetchProcesses, fetchEligibility } from '../services/processes-service';
import { ApiError } from '../services/http-client';
import type { Eligibility, ProcessSummary } from '../types/api';

export default function VerificarElegibilidad() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processes, setProcesses] = useState<ProcessSummary[]>([]);
  const [selectedProcessId, setSelectedProcessId] = useState<string>('');
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const isTeacher = user?.backendRole === 'teacher';

  useEffect(() => {
    if (!isTeacher) return;
    fetchProcesses()
      .then((all) => setProcesses(all.filter((p) => p.status === 'open')))
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : 'No se pudieron cargar los procesos.'));
  }, [isTeacher]);

  const handleVerify = async () => {
    if (!selectedProcessId) return;
    try {
      setVerifying(true);
      setError(null);

      const sessionJson = window.localStorage.getItem('uta-promo-session');
      const session = sessionJson ? JSON.parse(sessionJson) : null;
      const externalAccessToken = session?.externalAccessToken;

      if (!externalAccessToken) {
        setError('Token externo no disponible. Inicie sesión nuevamente.');
        setEligibility(null);
        return;
      }

      setEligibility(await fetchEligibility(selectedProcessId, externalAccessToken));
    } catch (err) {
      setEligibility(null);
      setError(err instanceof ApiError ? err.message : 'No se pudo evaluar su elegibilidad.');
    } finally {
      setVerifying(false);
    }
  };

  if (!isTeacher) {
    return (
      <Alert>
        <AlertDescription>La verificación de elegibilidad está disponible solo para docentes.</AlertDescription>
      </Alert>
    );
  }

  const selectedProcess = processes.find((p) => p.id === selectedProcessId);
  const canApply = eligibility?.isEligible && selectedProcess && !selectedProcess.hasApplied;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl">Verificar Elegibilidad</h1>
        <p className="text-muted-foreground">
          Compare su hoja de vida con los requisitos de un proceso de promoción abierto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Seleccione un proceso
          </CardTitle>
          <CardDescription>Solo se listan los procesos con ventana de postulación abierta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-md">
            <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
              <SelectTrigger>
                <SelectValue placeholder="Procesos abiertos..." />
              </SelectTrigger>
              <SelectContent>
                {processes.map((process) => (
                  <SelectItem key={process.id} value={process.id}>
                    {process.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => void handleVerify()}
            disabled={!selectedProcessId || verifying}
            className="bg-[#00345E]"
          >
            {verifying ? 'Verificando...' : 'Verificar requisitos'}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Alert>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {eligibility && (
        <>
          <EligibilityDashboard eligibility={eligibility} />
          {canApply && (
            <div className="flex justify-end">
              <Button
                className="bg-[#00345E]"
                onClick={() => navigate(`/promociones/${selectedProcessId}/postular`)}
              >
                <Send className="mr-2 h-4 w-4" />
                Continuar con la postulación
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
