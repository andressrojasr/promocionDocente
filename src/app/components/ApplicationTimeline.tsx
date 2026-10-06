import type { ReactNode } from 'react';
import { Check, Circle, Clock, Minus, X } from 'lucide-react';
import { cn } from './ui/utils';
import { formatDateTime } from '../utils/format';
import type { TimelineStep, TimelineStepState } from '../utils/application-timeline';

const MARKER: Record<TimelineStepState, { className: string; icon: ReactNode }> = {
  done: { className: 'bg-green-600 text-white', icon: <Check className="h-4 w-4" /> },
  current: { className: 'bg-amber-500 text-white ring-4 ring-amber-100', icon: <Clock className="h-4 w-4" /> },
  rejected: { className: 'bg-red-600 text-white', icon: <X className="h-4 w-4" /> },
  skipped: { className: 'bg-gray-300 text-white', icon: <Minus className="h-4 w-4" /> },
  pending: { className: 'border-2 border-gray-300 bg-white text-gray-300', icon: <Circle className="h-3 w-3" /> }
};

const TITLE_CLASS: Record<TimelineStepState, string> = {
  done: 'text-gray-900',
  current: 'text-amber-700',
  rejected: 'text-red-700',
  skipped: 'text-gray-500',
  pending: 'text-gray-400'
};

/** Recorrido vertical de una postulación: qué ya pasó, dónde está y qué falta. */
export function ApplicationTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <ol className="space-y-0">
      {steps.map((step, index) => {
        const marker = MARKER[step.state];
        const isLast = index === steps.length - 1;

        return (
          <li key={step.key} className="flex gap-4">
            <div className="flex flex-col items-center">
              <span className={cn('flex h-8 w-8 flex-none items-center justify-center rounded-full', marker.className)}>
                {marker.icon}
              </span>
              {!isLast && <span className="my-1 w-px flex-1 bg-gray-200" />}
            </div>
            <div className={cn('min-w-0 flex-1', !isLast && 'pb-6')}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className={cn('font-medium', TITLE_CLASS[step.state])}>{step.title}</p>
                {step.date && <p className="text-xs text-muted-foreground">{formatDateTime(step.date)}</p>}
              </div>
              <p className={cn('text-sm', step.state === 'pending' ? 'text-gray-400' : 'text-muted-foreground')}>
                {step.description}
              </p>
              {step.feedback && (
                <p className="mt-2 rounded-lg border bg-secondary/60 p-3 text-sm text-gray-700">{step.feedback}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
