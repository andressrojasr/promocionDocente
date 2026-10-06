import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from './ui/dialog';
import { ActaDownloadButton } from './ActaDownloadButton';
import { formatDate, formatDateTime } from '../utils/format';
import type { ReviewSession } from '../types/api';

interface ReviewSessionDialogProps {
  session: ReviewSession | null;
  onClose: () => void;
  /** Solo CP descarga el acta de promoción. */
  showActa?: boolean;
}

/** Detalle de la sesión de revisión (proceso, facultad, comisión) que decidió una postulación. */
export function ReviewSessionDialog({ session, onClose, showActa = false }: ReviewSessionDialogProps) {
  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sesión de revisión</DialogTitle>
          <DialogDescription>Comisión que aprobó o rechazó esta postulación.</DialogDescription>
        </DialogHeader>
        {session && (
          <div className="space-y-2 rounded-lg border p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Proceso: </span>
              <span className="font-medium">{session.processName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Facultad: </span>
              <span className="font-medium">{session.facultyName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Comisión: </span>
              <span className="font-medium">
                {session.commissionIsPrincipal ? 'Principal' : `Sesión del ${formatDate(session.commissionDate)}`}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Creada por: </span>
              <span className="font-medium">{session.createdByName}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Fecha: </span>
              <span className="font-medium">{formatDateTime(session.createdAt)}</span>
            </p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {showActa && session && <ActaDownloadButton session={session} size="default" label="Descargar acta PDF" />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
