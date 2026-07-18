export type PositionCategory = 'asistente' | 'asociado' | 'titular' | 'auxiliar' | 'investigador';

export interface PromotionValidationResult {
  eligible: boolean;
  reasons: string[];
  currentPosition: PositionCategory;
  targetPosition: PositionCategory | string;
}
