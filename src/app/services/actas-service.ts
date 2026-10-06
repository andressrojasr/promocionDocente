import { API_URL, httpClient } from './http-client';
import { getStoredSession } from './session-service';
import type { ActaCategory } from '../types/api';

/** Categorías con decisiones en una sesión cerrada (se genera un acta por categoría). */
export function fetchActaCategories(reviewSessionId: string): Promise<ActaCategory[]> {
  const params = new URLSearchParams({ reviewSessionId });
  return httpClient.get<ActaCategory[]>(`/api/v1/actas/cp/by-session/categories?${params.toString()}`);
}

/**
 * Descarga el acta de promoción (PDF) de una sesión de revisión cerrada, para una categoría.
 * La respuesta es un archivo binario, así que no pasa por httpClient (que espera JSON).
 */
export async function downloadCpActaBySession(
  reviewSessionId: string,
  facultyNameForFile: string,
  category?: Pick<ActaCategory, 'fromPosition' | 'toPosition' | 'fromLabel' | 'toLabel'>
): Promise<void> {
  const session = getStoredSession();
  if (!session?.appToken) {
    throw new Error('Sesión no disponible. Inicie sesión nuevamente.');
  }

  const params = new URLSearchParams({ reviewSessionId });
  if (category) {
    params.set('fromPosition', category.fromPosition);
    params.set('toPosition', category.toPosition);
  }

  const response = await fetch(`${API_URL}/api/v1/actas/cp/by-session?${params.toString()}`, {
    headers: { Authorization: `Bearer ${session.appToken}` }
  });

  if (!response.ok) {
    let message = 'No se pudo generar el acta.';
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // la respuesta no era JSON; se conserva el mensaje genérico
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const categorySuffix = category ? `-${category.fromLabel}-a-${category.toLabel}` : '';
  link.href = url;
  link.download = `acta-promocion-${facultyNameForFile}${categorySuffix}-${new Date().toISOString().split('T')[0]}.pdf`
    .replace(/\s+/g, '-');
  link.click();
  URL.revokeObjectURL(url);
}
