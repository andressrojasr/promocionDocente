import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import type { ApplicationStatus, ProcessStatus } from '../types/api';
import { APPLICATION_STATUS_LABELS, PROCESS_STATUS_LABELS } from '../utils/format';

const APPLICATION_STATUS_STYLES: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-100 text-blue-800 border-blue-200',
  th_approved: 'bg-sky-100 text-sky-800 border-sky-200',
  th_rejected: 'bg-red-100 text-red-800 border-red-200',
  cp_rejected: 'bg-orange-100 text-orange-800 border-orange-200',
  appealed: 'bg-purple-100 text-purple-800 border-purple-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200'
};

export function ApplicationStatusBadge({ status, className }: { status: ApplicationStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(APPLICATION_STATUS_STYLES[status], className)}>
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

const PROCESS_STATUS_STYLES: Record<ProcessStatus, string> = {
  scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  open: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200'
};

export function ProcessStatusBadge({ status, className }: { status: ProcessStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn(PROCESS_STATUS_STYLES[status], className)}>
      {PROCESS_STATUS_LABELS[status]}
    </Badge>
  );
}
