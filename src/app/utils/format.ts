import type { ApplicationItemType, ApplicationStatus, BackendRole, ProcessStatus } from '../types/api';

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-EC', { dateStyle: 'medium' });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('es-EC', { dateStyle: 'medium', timeStyle: 'short' });
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Enviada - En revisión de TH',
  th_approved: 'Aprobada por TH - En revisión de CP',
  th_rejected: 'Rechazada por Talento Humano',
  cp_rejected: 'Rechazada por CP - Apelable',
  appealed: 'Apelada - En revisión de CA',
  approved: 'Promoción aprobada',
  rejected: 'Rechazada definitivamente'
};

export const PROCESS_STATUS_LABELS: Record<ProcessStatus, string> = {
  scheduled: 'Programado',
  open: 'Abierto',
  closed: 'Cerrado'
};

export const ITEM_TYPE_LABELS: Record<ApplicationItemType, string> = {
  publication: 'Publicaciones',
  received_training: 'Capacitaciones recibidas',
  given_training: 'Capacitaciones impartidas',
  research_project: 'Proyectos de investigación',
  doctoral_thesis: 'Tesis doctorales dirigidas',
  language: 'Certificaciones de idiomas',
  experience: 'Experiencia docente'
};

export const BACKEND_ROLE_LABELS: Record<BackendRole, string> = {
  admin: 'Administrador',
  cp: 'Comisión de Promoción',
  th: 'Talento Humano',
  ca: 'Comisión de Apelaciones',
  teacher: 'Docente'
};

export const REVIEW_STAGE_LABELS: Record<'th' | 'cp' | 'ca', string> = {
  th: 'Talento Humano',
  cp: 'Comisión de Promoción',
  ca: 'Comisión de Apelaciones'
};
