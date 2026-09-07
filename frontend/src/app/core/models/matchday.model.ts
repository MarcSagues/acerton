import { Competition } from './competition.model';

export type PredictionChoice = 'HOME' | 'DRAW' | 'AWAY';
export type MatchdayStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'FINISHED';
export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';

export interface Match {
  id: string;
  matchdayId: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  kickoff: string;
  status: MatchStatus;
  homeScore: number | null;
  awayScore: number | null;
  result: PredictionChoice | null;
}

export interface Matchday {
  id: string;
  competitionId: string;
  season: number;
  name: string;
  order: number;
  closesAt: string;
  status: MatchdayStatus;
  /** false cuando esta jornada todavia no le toca (previsualizada con "siguiente"), aunque sus partidos no esten bloqueados por horario. */
  canPredict: boolean;
  /** ISO date: 4 dias antes del primer partido — antes de esto no se admiten pronosticos aunque canPredict sea true. */
  opensAt: string;
  matches: Match[];
  competition?: Competition;
}

export interface CurrentMatchdayEntry {
  competition: Competition;
  matchday: Matchday;
}
