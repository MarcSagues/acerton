import { MatchdayHistoryEntry } from '../../../core/models/ranking.model';

/** Nombre de liga lo bastante corto para ir bajo cada jornada en el eje de la grafica de "General". */
const SHORT_NAMES: Record<string, string> = {
  LA_LIGA: 'Liga',
  PREMIER_LEAGUE: 'Prem',
  SERIE_A: 'Serie',
  BUNDESLIGA: 'Bund',
  LIGUE_1: 'L1',
  CHAMPIONS_LEAGUE: 'UCL',
  CONFERENCE_LEAGUE: 'UECL',
};

export function competitionShortName(code: string, name: string): string {
  return SHORT_NAMES[code] ?? name.slice(0, 4);
}

export interface CompetitionHistoryPart {
  competition: { id: string; name: string; code: string };
  matchdays: MatchdayHistoryEntry[];
}

/**
 * Junta las jornadas finalizadas de varias ligas en una sola lista, de la mas nueva a la mas antigua por fecha, cada
 * una marcada con su liga: es la base de la grafica de "General" (J1 Liga, J1 Champions, J2 Liga...). Si algun backend
 * no manda la fecha no se puede ordenar entre ligas, y se devuelve vacio (sin grafica) en vez de mezclar mal.
 */
export function mergeCompetitionHistories(parts: readonly CompetitionHistoryPart[]): MatchdayHistoryEntry[] {
  const merged = parts.flatMap((part) => part.matchdays.map((matchday) => ({ ...matchday, competition: part.competition })));
  if (merged.some((matchday) => !matchday.closesAt)) return [];
  return merged.sort(
    (a, b) => Date.parse(b.closesAt!) - Date.parse(a.closesAt!) || b.order - a.order || a.competition.name.localeCompare(b.competition.name),
  );
}
