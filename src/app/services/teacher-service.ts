import { httpClient } from './http-client';
import type { TeacherProfileData } from '../types/api';

/** Hoja de vida del docente autenticado (último snapshot sincronizado desde RRHH). */
export function fetchMyProfile(): Promise<TeacherProfileData> {
  return httpClient.get<TeacherProfileData>('/api/v1/teachers/me/profile');
}
