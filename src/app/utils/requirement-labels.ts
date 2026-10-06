import { ITEM_TYPE_LABELS } from './format';
import type { ApplicationItemType } from '../types/api';

interface RequirementLike {
  code: string;
  label: string;
}

/** Códigos de requisito que respaldan cada tipo de documento, en orden de preferencia. */
const REQUIREMENT_CODES_BY_ITEM_TYPE: Record<ApplicationItemType, string[]> = {
  publication: ['PUBLICATIONS', 'PUBLICATIONS_OTHER_LANGUAGE'],
  received_training: ['TRAINING_HOURS', 'PEDAGOGICAL_HOURS'],
  given_training: ['GIVEN_TRAINING_HOURS'],
  research_project: ['PROJECT_MONTHS', 'INTERNATIONAL_PROJECTS'],
  doctoral_thesis: ['DOCTORAL_THESES', 'THESES_IN_RANK'],
  language: ['LANGUAGE_LEVEL'],
  experience: ['YEARS_IN_RANK']
};

/**
 * Título de la sección de documentos de un tipo: el mismo texto del requisito que lo
 * respalda (así el panel de requisitos y el de documentos dicen lo mismo). Si el proceso
 * no tiene ese requisito, usa el nombre genérico del tipo.
 */
export function sectionTitleFor(itemType: ApplicationItemType, requirements?: RequirementLike[] | null): string {
  const codes = REQUIREMENT_CODES_BY_ITEM_TYPE[itemType];
  const match = codes
    .map((code) => requirements?.find((req) => req.code === code))
    .find((req) => req !== undefined);
  return match?.label ?? ITEM_TYPE_LABELS[itemType];
}

/** Posición del requisito de un tipo en el panel izquierdo, para ordenar las secciones igual. */
export function sectionOrderFor(itemType: ApplicationItemType, requirements?: RequirementLike[] | null): number {
  const codes = REQUIREMENT_CODES_BY_ITEM_TYPE[itemType];
  const index = requirements?.findIndex((req) => codes.includes(req.code)) ?? -1;
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
