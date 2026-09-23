import { httpClient } from './http-client';
import { getExternalAccessToken } from './session-service';
import type { TeacherProfileData, TeacherSummary } from '../types/api';

/** Hoja de vida del docente autenticado (datos frescos de RRHH). */
export function fetchMyProfile(externalAccessToken: string): Promise<TeacherProfileData> {
  return httpClient.get<TeacherProfileData>(
    '/api/v1/teachers/me/profile',
    { 'X-External-Token': externalAccessToken }
  );
}

/** Busca docentes/autoridades por nombre o cédula, para integrar comisiones. */
export function searchTeachers(query?: string): Promise<TeacherSummary[]> {
  const token = getExternalAccessToken();
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  const qs = params.toString();

  return httpClient.get<TeacherSummary[]>(
    `/api/v1/teachers${qs ? `?${qs}` : ''}`,
    token ? { 'X-External-Token': token } : undefined
  );
}
