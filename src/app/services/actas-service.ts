import { API_URL } from './http-client';
import { getStoredSession } from './session-service';

/**
 * Descarga el PDF devuelto por un endpoint de actas. La respuesta es un archivo
 * binario, así que no pasa por httpClient (que espera el envelope ApiResponse en JSON).
 */
async function downloadActaPdf(path: string, facultyNameForFile: string): Promise<void> {
  const session = getStoredSession();
  if (!session?.appToken) {
    throw new Error('Sesión no disponible. Inicie sesión nuevamente.');
  }

  const response = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${session.appToken}` }
  });

  if (!response.ok) {
    throw new Error('No se pudo generar el acta. Verifique que existan postulaciones decididas en esta sesión.');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `acta-promocion-${facultyNameForFile.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Descarga el acta de promoción (PDF) de una comisión de CP para una facultad determinada. */
export function downloadCpActa(commissionId: string, facultyId: string, facultyName: string): Promise<void> {
  const params = new URLSearchParams({ commissionId, facultyId, facultyName });
  return downloadActaPdf(`/api/v1/actas/cp?${params.toString()}`, facultyName);
}

/** Descarga el acta de promoción (PDF) a partir de una sesión de revisión ya registrada. */
export function downloadCpActaBySession(reviewSessionId: string, facultyNameForFile: string): Promise<void> {
  const params = new URLSearchParams({ reviewSessionId });
  return downloadActaPdf(`/api/v1/actas/cp/by-session?${params.toString()}`, facultyNameForFile);
}
