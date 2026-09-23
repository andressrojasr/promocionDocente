import { httpClient } from './http-client';
import { getExternalAccessToken } from './session-service';
import type { Faculty } from '../types/api';

/** Catálogo de facultades, usado para filtrar postulaciones e integrar comisiones. */
export function fetchFaculties(): Promise<Faculty[]> {
  const token = getExternalAccessToken();
  return httpClient.get<Faculty[]>(
    '/api/v1/faculties',
    token ? { 'X-External-Token': token } : undefined
  );
}
