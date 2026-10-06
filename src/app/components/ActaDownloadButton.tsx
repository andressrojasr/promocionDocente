import { useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { downloadCpActaBySession, fetchActaCategories } from '../services/actas-service';
import type { ActaCategory, ReviewSession } from '../types/api';

interface ActaDownloadButtonProps {
  session: ReviewSession;
  label?: string;
  size?: 'default' | 'sm';
}

/**
 * Descarga el acta de una sesión de revisión. Solo está disponible con la sesión cerrada
 * y se genera por categoría: si la sesión decidió una sola, se descarga directo; si hubo
 * varias, se pide elegir cuál.
 */
export function ActaDownloadButton({ session, label = 'Acta PDF', size = 'sm' }: ActaDownloadButtonProps) {
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<ActaCategory[] | null>(null);
  const isOpen = session.closedAt === null;

  const notifyIfProvisional = (category: ActaCategory) => {
    if (category.pendingAppeals > 0) {
      toast.info(
        `Acta provisional: ${category.pendingAppeals} solicitud${category.pendingAppeals === 1 ? '' : 'es'} aún en plazo de apelación o con apelación en trámite.`
      );
    }
  };

  const download = async (category?: ActaCategory) => {
    try {
      setBusy(true);
      await downloadCpActaBySession(session.id, session.facultyName, category);
      if (category) notifyIfProvisional(category);
      setCategories(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el acta.');
    } finally {
      setBusy(false);
    }
  };

  const handleClick = async () => {
    try {
      setBusy(true);
      const available = await fetchActaCategories(session.id);
      if (available.length === 0) {
        toast.error('La sesión no tiene postulaciones decididas para generar el acta.');
        return;
      }
      if (available.length === 1) {
        await downloadCpActaBySession(session.id, session.facultyName, available[0]);
        notifyIfProvisional(available[0]);
        return;
      }
      setCategories(available);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo generar el acta.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        size={size}
        className="bg-[#00345E]"
        disabled={isOpen || busy}
        title={isOpen ? 'Cierre la sesión para poder generar el acta' : undefined}
        onClick={() => void handleClick()}
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        {busy ? 'Generando...' : label}
      </Button>

      <Dialog open={categories !== null} onOpenChange={(open) => !open && !busy && setCategories(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccione la categoría del acta</DialogTitle>
            <DialogDescription>
              Esta sesión decidió postulaciones de varias categorías. Se genera un acta por categoría.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {categories?.map((category) => (
              <div
                key={`${category.fromPosition}-${category.toPosition}`}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div>
                  <p className="text-sm font-medium">
                    {category.fromLabel} → {category.toLabel}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {category.approvedCount} aprobada{category.approvedCount === 1 ? '' : 's'} ·{' '}
                    {category.rejectedCount} rechazada{category.rejectedCount === 1 ? '' : 's'}
                  </p>
                  {category.pendingAppeals > 0 && (
                    <p className="text-xs font-medium text-amber-700">
                      Provisional: {category.pendingAppeals} con apelación pendiente
                    </p>
                  )}
                </div>
                <Button size="sm" className="bg-[#00345E]" disabled={busy} onClick={() => void download(category)}>
                  <Download className="mr-1 h-3.5 w-3.5" />
                  {category.pendingAppeals > 0 ? 'Descargar provisional' : 'Descargar definitiva'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
