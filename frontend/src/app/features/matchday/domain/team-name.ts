import { Match } from '../../../core/models/matchday.model';

/**
 * Nombre corto del equipo (el del proveedor: "Barça", "Atleti") para sitios con
 * poco espacio, como las imágenes de compartir. Si el partido todavía no lo
 * tiene, el nombre completo.
 */
export function shortTeamName(
  match: Pick<Match, 'homeTeam' | 'awayTeam' | 'homeTeamShort' | 'awayTeamShort'>,
  side: 'home' | 'away',
): string {
  const short = side === 'home' ? match.homeTeamShort : match.awayTeamShort;
  const full = side === 'home' ? match.homeTeam : match.awayTeam;
  return short?.trim() || full;
}
