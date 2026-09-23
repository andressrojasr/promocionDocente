import { Label } from './ui/label';
import { Input } from './ui/input';
import { TeacherSearchInput } from './TeacherSearchInput';
import type { TeacherSummary } from '../types/api';

export interface CommissionMemberDraft {
  cargoLabel: string;
  teacher: TeacherSummary | null;
}

interface CommissionMembersEditorProps {
  members: CommissionMemberDraft[];
  onChange: (members: CommissionMemberDraft[]) => void;
  disabled?: boolean;
}

/**
 * Edita los 6 cargos de una comisión (CP o CA): el cargo es texto libre (editable,
 * por si hay que ajustarlo a un delegado) y el docente/autoridad se busca por
 * nombre o cédula con el directorio de RRHH.
 */
export function CommissionMembersEditor({ members, onChange, disabled }: CommissionMembersEditorProps) {
  const updateMember = (index: number, next: Partial<CommissionMemberDraft>) => {
    onChange(members.map((m, i) => (i === index ? { ...m, ...next } : m)));
  };

  return (
    <div className="space-y-4">
      {members.map((member, index) => (
        <div key={index} className="grid gap-2 rounded-lg border p-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Cargo en la comisión</Label>
            <Input
              value={member.cargoLabel}
              disabled={disabled}
              onChange={(e) => updateMember(index, { cargoLabel: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Docente / autoridad</Label>
            <TeacherSearchInput
              value={member.teacher}
              disabled={disabled}
              onChange={(teacher) => updateMember(index, { teacher })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
