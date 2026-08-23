import { httpClient } from './http-client';
import type {
  ApplicationDetail,
  ApplicationItemPayload,
  ApplicationSummary
} from '../types/api';

export function submitApplication(
  processId: string,
  items: ApplicationItemPayload[],
  externalAccessToken: string
): Promise<ApplicationDetail> {
  return httpClient.post<ApplicationDetail>(
    '/api/v1/applications',
    { processId, items },
    { 'X-External-Token': externalAccessToken }
  );
}

export function fetchApplications(status?: string, processId?: string): Promise<ApplicationSummary[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (processId) params.set('processId', processId);
  const query = params.toString();
  return httpClient.get<ApplicationSummary[]>(`/api/v1/applications${query ? `?${query}` : ''}`);
}

export function fetchApplicationDetail(applicationId: string): Promise<ApplicationDetail> {
  return httpClient.get<ApplicationDetail>(`/api/v1/applications/${applicationId}?includeEligibility=true`);
}

/** Registra la decisión de la etapa que corresponde al rol del usuario (TH, CP o CA). */
export function reviewApplication(
  applicationId: string,
  decision: 'approved' | 'rejected',
  feedback?: string
): Promise<ApplicationDetail> {
  return httpClient.post<ApplicationDetail>(`/api/v1/applications/${applicationId}/review`, {
    decision,
    feedback: feedback || null
  });
}

/** Apela un rechazo de la Comisión de Promoción dentro del plazo de 3 días. */
export function appealApplication(applicationId: string, justification: string): Promise<ApplicationDetail> {
  return httpClient.post<ApplicationDetail>(`/api/v1/applications/${applicationId}/appeal`, { justification });
}
