import { ScoringMode } from '../../core/models/group.model';

/** Insignia corta del modo de puntuacion de un grupo, para mostrar en vez de un avatar con la inicial. */
export function scoringModeBadgeLabel(mode: ScoringMode): string {
  return mode === 'EXACT_SCORE' ? '3-1' : '1X2';
}
