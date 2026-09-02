import { httpClient } from './http-client';
import type { CpDashboardData } from '../types/dashboard';

export function fetchCpDashboardData(
  status?: string,
  processId?: string,
  teacherId?: string
): Promise<CpDashboardData> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (processId) params.set('processId', processId);
  if (teacherId) params.set('teacherId', teacherId);
  const query = params.toString();
  return httpClient.get<CpDashboardData>(`/api/v1/dashboard/cp/data${query ? `?${query}` : ''}`);
}

export function exportCpDashboardToCSV(data: CpDashboardData): void {
  const headers = [
    'ID Postulación',
    'Docente',
    'Cédula',
    'Proceso',
    'Transición',
    'Estado',
    'Enviada',
    'Decidida',
    'Días',
    'Score',
    'Revisor'
  ];

  const rows = data.applications.map(app => [
    app.applicationId,
    app.teacherName,
    app.teacherId,
    app.processName,
    `${app.fromPosition} → ${app.toPosition}`,
    app.status,
    new Date(app.submittedAt).toLocaleDateString(),
    app.decidedAt ? new Date(app.decidedAt).toLocaleDateString() : '',
    app.daysToDecision ?? '',
    app.scorePct?.toFixed(2) ?? '',
    app.currentReviewerName ?? ''
  ]);

  const csv = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `reporte-promociones-${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
}
