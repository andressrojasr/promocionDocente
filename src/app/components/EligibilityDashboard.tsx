import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import type { Eligibility } from '../types/api';

interface EligibilityDashboardProps {
  eligibility: Eligibility;
}

/**
 * Dashboard de requisitos: muestra cada requisito de la transición del docente
 * con el valor exigido, el alcanzado y si se cumple.
 */
export function EligibilityDashboard({ eligibility }: EligibilityDashboardProps) {
  const metCount = eligibility.requirements.filter((r) => r.met).length;
  const total = eligibility.requirements.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>
            Requisitos: {eligibility.fromLabel} → {eligibility.toLabel}
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              eligibility.isEligible
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-red-100 text-red-800 border-red-200'
            )}
          >
            {metCount}/{total} requisitos cumplidos
          </Badge>
        </div>
        <p className={cn('text-sm', eligibility.isEligible ? 'text-green-700' : 'text-red-700')}>
          {eligibility.isEligible
            ? 'Cumple todos los requisitos: puede realizar su postulación.'
            : 'Aún no cumple todos los requisitos para postular en este proceso.'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {eligibility.requirements.map((requirement) => (
          <div
            key={requirement.code}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-4',
              requirement.met ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            )}
          >
            {requirement.met ? (
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-none text-green-600" />
            ) : (
              <XCircle className="mt-0.5 h-5 w-5 flex-none text-red-600" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{requirement.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{requirement.detail}</p>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span>
                  <span className="text-muted-foreground">Requerido:</span>{' '}
                  <span className="font-medium">{requirement.required}</span>
                </span>
                <span>
                  <span className="text-muted-foreground">Alcanzado:</span>{' '}
                  <span className={cn('font-medium', requirement.met ? 'text-green-700' : 'text-red-700')}>
                    {requirement.actual}
                  </span>
                </span>
              </div>
            </div>
          </div>
        ))}

        {eligibility.notes && (
          <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <Info className="mt-0.5 h-5 w-5 flex-none text-blue-600" />
            <p className="text-sm text-blue-900">{eligibility.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
