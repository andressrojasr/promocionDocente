import { Badge } from './ui/badge';
import { cn } from './ui/utils';

export type Status = 'aprobado' | 'rechazado' | 'pendiente' | 'revision' | 'apelacion' | 'activo' | 'inactivo';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
  aprobado: { label: 'Aprobado', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' },
  rechazado: { label: 'Rechazado', variant: 'destructive', className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200' },
  pendiente: { label: 'Pendiente', variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200' },
  revision: { label: 'En Revisión', variant: 'secondary', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200' },
  apelacion: { label: 'En Apelación', variant: 'secondary', className: 'bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200' },
  activo: { label: 'Activo', variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200' },
  inactivo: { label: 'Inactivo', variant: 'secondary', className: 'bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-200' }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
