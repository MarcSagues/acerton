import { ScoringMode } from '../../core/models/group.model';

/** Mismo icono que se usa al elegir el modo en Crear grupo, para reconocerlo de un vistazo en vez de un avatar con la inicial. */
export function scoringModeIcon(mode: ScoringMode): string {
  return mode === 'EXACT_SCORE' ? 'objetivo' : 'marcador';
}
