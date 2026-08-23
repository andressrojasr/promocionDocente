import { httpClient } from './http-client';
import type {
  CreateProcessPayload,
  Eligibility,
  ProcessDetail,
  ProcessSummary,
  RequirementConfig
} from '../types/api';

export function fetchProcesses(): Promise<ProcessSummary[]> {
  return httpClient.get<ProcessSummary[]>('/api/v1/processes');
}

export function fetchProcessDetail(processId: string): Promise<ProcessDetail> {
  return httpClient.get<ProcessDetail>(`/api/v1/processes/${processId}`);
}

/** Valores por defecto del reglamento para pre-llenar el formulario de creación (rol CP). */
export function fetchRequirementDefaults(): Promise<RequirementConfig[]> {
  return httpClient.get<RequirementConfig[]>('/api/v1/processes/requirement-defaults');
}

export function createProcess(payload: CreateProcessPayload): Promise<ProcessDetail> {
  return httpClient.post<ProcessDetail>('/api/v1/processes', payload);
}

/** Dashboard de elegibilidad del docente autenticado frente a un proceso. */
export function fetchEligibility(processId: string, externalAccessToken: string): Promise<Eligibility> {
  return httpClient.get<Eligibility>(
    `/api/v1/processes/${processId}/eligibility`,
    { 'X-External-Token': externalAccessToken }
  );
}
