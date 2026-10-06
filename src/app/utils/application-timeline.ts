import { formatDateTime } from './format';
import type { ApplicationDetail, ReviewDto } from '../types/api';

export type TimelineStepState = 'done' | 'current' | 'pending' | 'rejected' | 'skipped';

export interface TimelineStep {
  key: string;
  title: string;
  state: TimelineStepState;
  /** Fecha del hecho (ISO), si ya ocurrió. */
  date?: string;
  /** Texto breve de lo que pasó o de lo que se espera. */
  description: string;
  /** Comentario del revisor, si lo dejó. */
  feedback?: string | null;
}

const lastReview = (reviews: ReviewDto[], stage: ReviewDto['stage']) =>
  [...reviews].filter((r) => r.stage === stage).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

/**
 * Arma el recorrido de una postulación (Enviada → TH → CP → Apelación → CA → Resultado)
 * a partir de su estado y de las revisiones registradas.
 */
export function buildTimeline(detail: ApplicationDetail): TimelineStep[] {
  const { summary, reviews, appeal } = detail;
  const status = summary.status;
  const th = lastReview(reviews, 'th');
  const cp = lastReview(reviews, 'cp');
  const ca = lastReview(reviews, 'ca');

  const steps: TimelineStep[] = [
    {
      key: 'submitted',
      title: 'Solicitud enviada',
      state: 'done',
      date: summary.submittedAt,
      description: 'Su solicitud y documentos quedaron registrados.'
    }
  ];

  // Talento Humano
  if (th) {
    steps.push({
      key: 'th',
      title: 'Talento Humano',
      state: th.decision === 'approved' ? 'done' : 'rejected',
      date: th.createdAt,
      description: th.decision === 'approved' ? 'Documentación aprobada.' : 'Solicitud rechazada.',
      feedback: th.feedback
    });
  } else {
    steps.push({
      key: 'th',
      title: 'Talento Humano',
      state: status === 'submitted' ? 'current' : 'pending',
      description: 'Revisión de la documentación presentada.'
    });
  }

  if (status === 'th_rejected') {
    steps.push({
      key: 'result',
      title: 'Resultado',
      state: 'rejected',
      description: 'Su solicitud fue rechazada en la revisión de Talento Humano.'
    });
    return steps;
  }

  // Comisión de Promoción
  if (cp) {
    steps.push({
      key: 'cp',
      title: 'Comisión de Promoción',
      state: cp.decision === 'approved' ? 'done' : 'rejected',
      date: cp.createdAt,
      description: cp.decision === 'approved' ? 'Promoción aprobada.' : 'Solicitud rechazada.',
      feedback: cp.feedback
    });
  } else {
    steps.push({
      key: 'cp',
      title: 'Comisión de Promoción',
      state: status === 'th_approved' ? 'current' : 'pending',
      description: 'Análisis de la solicitud y de los requisitos.'
    });
  }

  // Apelación (solo si CP rechazó)
  if (cp?.decision === 'rejected') {
    if (appeal) {
      steps.push({
        key: 'appeal',
        title: 'Apelación',
        state: 'done',
        date: appeal.submittedAt,
        description: 'Presentó su apelación.',
        feedback: appeal.justification
      });
    } else if (status === 'cp_rejected' && summary.appealDeadline) {
      steps.push({
        key: 'appeal',
        title: 'Apelación',
        state: 'current',
        description: detail.canAppeal
          ? `Puede apelar hasta el ${formatDateTime(summary.appealDeadline)}.`
          : 'El plazo de apelación venció.'
      });
    } else {
      steps.push({
        key: 'appeal',
        title: 'Apelación',
        state: 'skipped',
        description: 'No se presentó apelación dentro del plazo de 3 días.'
      });
    }
  }

  // Comisión de Apelaciones
  if (appeal) {
    if (ca) {
      steps.push({
        key: 'ca',
        title: 'Comisión de Apelaciones',
        state: ca.decision === 'approved' ? 'done' : 'rejected',
        date: ca.createdAt,
        description: ca.decision === 'approved' ? 'Apelación aceptada: promoción aprobada.' : 'Apelación rechazada.',
        feedback: ca.feedback
      });
    } else {
      steps.push({
        key: 'ca',
        title: 'Comisión de Apelaciones',
        state: 'current',
        description: 'Su apelación está en revisión.'
      });
    }
  }

  // Resultado
  if (status === 'approved') {
    steps.push({
      key: 'result',
      title: 'Resultado',
      state: 'done',
      description: `Promoción aprobada: ${summary.fromLabel} → ${summary.toLabel}.`
    });
  } else if (status === 'rejected') {
    steps.push({
      key: 'result',
      title: 'Resultado',
      state: 'rejected',
      description: 'Su solicitud fue rechazada de forma definitiva.'
    });
  } else {
    steps.push({
      key: 'result',
      title: 'Resultado',
      state: 'pending',
      description: 'Se informará cuando termine la revisión.'
    });
  }

  return steps;
}

/** Mensaje principal según el estado actual de la postulación. */
export function statusHeadline(detail: ApplicationDetail): { text: string; tone: 'info' | 'success' | 'danger' | 'warning' } {
  const { summary } = detail;

  switch (summary.status) {
    case 'submitted':
      return { text: 'Su solicitud está pendiente de revisión de Talento Humano.', tone: 'info' };
    case 'th_approved':
      return { text: 'Talento Humano aprobó su documentación. Ahora la revisa la Comisión de Promoción.', tone: 'info' };
    case 'th_rejected':
      return { text: 'Talento Humano rechazó su solicitud.', tone: 'danger' };
    case 'cp_rejected':
      return detail.canAppeal && summary.appealDeadline
        ? {
            text: `La Comisión de Promoción rechazó su solicitud. Puede apelar hasta el ${formatDateTime(summary.appealDeadline)}.`,
            tone: 'warning'
          }
        : { text: 'La Comisión de Promoción rechazó su solicitud y el plazo de apelación venció.', tone: 'danger' };
    case 'appealed':
      return { text: 'Su apelación fue presentada y está en revisión de la Comisión de Apelaciones.', tone: 'info' };
    case 'approved':
      return { text: `¡Su promoción fue aprobada! ${summary.fromLabel} → ${summary.toLabel}.`, tone: 'success' };
    case 'rejected':
      return { text: 'Su solicitud fue rechazada de forma definitiva.', tone: 'danger' };
    default:
      return { text: '', tone: 'info' };
  }
}
