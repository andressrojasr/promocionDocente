import { DEFAULT_COMMISSION_CARGOS } from '../constants/commission-cargos';
import type { CommissionMemberDraft } from '../components/CommissionMembersEditor';
import type { Commission } from '../types/api';

/**
 * Arma el borrador de los 6 cargos para una comisión nueva. Si ya existe una comisión
 * principal para el proceso, prellena cada cargo con su integrante actual (el usuario
 * solo reemplaza los que necesiten delegado); si no hay principal (primera comisión del
 * proceso), parte de los cargos oficiales en blanco.
 */
export function buildDraftFromPrincipal(principal: Commission | undefined): CommissionMemberDraft[] {
  if (!principal) {
    return DEFAULT_COMMISSION_CARGOS.map((cargoLabel) => ({ cargoLabel, teacher: null }));
  }

  return [...principal.members]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((m) => ({
      cargoLabel: m.cargoLabel,
      teacher: {
        teacherId: m.teacherExternalId ?? '',
        identification: m.teacherIdentification,
        fullName: m.teacherFullName,
        facultyId: null,
        facultyName: null
      }
    }));
}
