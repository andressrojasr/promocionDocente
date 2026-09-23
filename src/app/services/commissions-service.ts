import { httpClient } from './http-client';
import type { Commission, CommissionType, CreateCommissionPayload } from '../types/api';

/** Comisiones (principal primero) de un proceso para el tipo indicado (cp/ca). */
export function fetchCommissions(processId: string, type: CommissionType): Promise<Commission[]> {
  return httpClient.get<Commission[]>(
    `/api/v1/commissions?processId=${encodeURIComponent(processId)}&type=${type}`
  );
}

export function fetchCommissionDetail(commissionId: string): Promise<Commission> {
  return httpClient.get<Commission>(`/api/v1/commissions/${commissionId}`);
}

/**
 * Crea una comisión para un día concreto (con delegados) o marca una nueva comisión
 * principal. Se usa para dejar constancia de quién aprobó/rechazó cada día.
 */
export function createCommission(payload: CreateCommissionPayload): Promise<Commission> {
  return httpClient.post<Commission>('/api/v1/commissions', payload);
}
