import { httpClient } from './http-client';
import type { CommissionType, CreateReviewSessionPayload, ReviewSession } from '../types/api';

/** Inicia una sesión de revisión: proceso + comisión + facultad. */
export function createReviewSession(payload: CreateReviewSessionPayload): Promise<ReviewSession> {
  return httpClient.post<ReviewSession>('/api/v1/review-sessions', payload);
}

export interface ReviewSessionFilters {
  processId?: string;
  type?: CommissionType;
  facultyId?: string;
  dateFrom?: string;
  dateTo?: string;
  /** true = solo cerradas, false = solo activas, undefined = todas. */
  closed?: boolean;
}

/** Busca sesiones de revisión pasadas, para reanudarlas o descargar su acta. */
export function fetchReviewSessions(filters?: ReviewSessionFilters): Promise<ReviewSession[]> {
  const params = new URLSearchParams();
  if (filters?.processId) params.set('processId', filters.processId);
  if (filters?.type) params.set('type', filters.type);
  if (filters?.facultyId) params.set('facultyId', filters.facultyId);
  if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters?.dateTo) params.set('dateTo', filters.dateTo);
  if (filters?.closed !== undefined) params.set('closed', String(filters.closed));
  const query = params.toString();
  return httpClient.get<ReviewSession[]>(`/api/v1/review-sessions${query ? `?${query}` : ''}`);
}

export function fetchReviewSessionDetail(id: string): Promise<ReviewSession> {
  return httpClient.get<ReviewSession>(`/api/v1/review-sessions/${id}`);
}

/** Cierra una sesión: ya no podrá usarse para decidir postulaciones ni reanudarse. */
export function closeReviewSession(id: string): Promise<ReviewSession> {
  return httpClient.post<ReviewSession>(`/api/v1/review-sessions/${id}/close`);
}
