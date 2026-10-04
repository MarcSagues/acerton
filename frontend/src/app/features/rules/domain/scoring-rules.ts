import { ScoringMode } from '../../../core/models/group.model';
import { t } from '../../../core/i18n/translate';

export interface ScoringRule {
  points: number;
  label: string;
  description: string;
  featured: boolean;
}

const EXACT_SCORE_RULES: ScoringRule[] = [
  { points: 5, label: t('scoringRules.marcadorExacto'), description: t('scoringRules.aciertasTodosGoles'), featured: true },
  { points: 2, label: t('scoringRules.signoCorrecto'), description: t('scoringRules.aciertasGanadorEmpate'), featured: false },
  { points: 0, label: t('scoringRules.sinAcierto'), description: t('scoringRules.resultadoCoincide'), featured: false },
];

const ONE_X_TWO_RULES: ScoringRule[] = [
  { points: 1, label: t('scoringRules.signoCorrecto'), description: t('scoringRules.localEmpateVisitante'), featured: true },
  { points: 0, label: t('scoringRules.sinAcierto'), description: t('scoringRules.signoCoincide'), featured: false },
];

export function scoringRules(mode: ScoringMode): ScoringRule[] {
  return mode === 'EXACT_SCORE' ? EXACT_SCORE_RULES : ONE_X_TWO_RULES;
}

export function scoringModeLabel(mode: ScoringMode): string {
  return mode === 'EXACT_SCORE' ? t('common.resultadoExacto') : t('common.quiniela1x2');
}
