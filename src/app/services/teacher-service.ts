import { httpClient } from './http-client';
import type { TeacherProfileData } from '../types/api';

/** Hoja de vida del docente autenticado (datos frescos de RRHH). */
export function fetchMyProfile(externalAccessToken: string): Promise<TeacherProfileData> {
  return httpClient.get<TeacherProfileData>(
    '/api/v1/teachers/me/profile',
    { 'X-External-Token': externalAccessToken }
  );
}
