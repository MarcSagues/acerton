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
  matches: Match[];
  competition?: Competition;
}

export interface CurrentMatchdayEntry {
  competition: Competition;
  matchday: Matchday;
}
