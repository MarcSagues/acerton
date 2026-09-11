import { ScoringMode } from '../../../core/models/group.model';

export interface ScoringRule {
  points: number;
  label: string;
  description: string;
  featured: boolean;
}

const EXACT_SCORE_RULES: ScoringRule[] = [
  { points: 5, label: 'Marcador exacto', description: 'Aciertas todos los goles', featured: true },
  { points: 2, label: 'Signo correcto', description: 'Aciertas ganador o empate', featured: false },
  { points: 0, label: 'Sin acierto', description: 'El resultado no coincide', featured: false },
];

const ONE_X_TWO_RULES: ScoringRule[] = [
  { points: 1, label: 'Signo correcto', description: 'Local, empate o visitante', featured: true },
  { points: 0, label: 'Sin acierto', description: 'El signo no coincide', featured: false },
];

export function scoringRules(mode: ScoringMode): ScoringRule[] {
  return mode === 'EXACT_SCORE' ? EXACT_SCORE_RULES : ONE_X_TWO_RULES;
}

export function scoringModeLabel(mode: ScoringMode): string {
  return mode === 'EXACT_SCORE' ? 'Resultado exacto' : 'Quiniela 1X2';
}
