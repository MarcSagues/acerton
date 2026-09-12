import { CompetitionCode } from '../../core/models/competition.model';

const TROPHY_BY_CODE: Partial<Record<CompetitionCode, string>> = {
  LA_LIGA: 'laliga',
  SERIE_A: 'seriea',
  BUNDESLIGA: 'bundesliga',
  LIGUE_1: 'ligue1',
  CHAMPIONS_LEAGUE: 'champions',
};

/** Devuelve el id de trofeo del sistema de diseño para esta competicion, o null si no hay arte dedicado (se usa el icono generico "trofeo"). */
export function competitionTrophyId(code: CompetitionCode): string | null {
  return TROPHY_BY_CODE[code] ?? null;
}
