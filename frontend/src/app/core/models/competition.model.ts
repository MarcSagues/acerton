export type CompetitionCode =
  | 'PREMIER_LEAGUE'
  | 'LA_LIGA'
  | 'SERIE_A'
  | 'BUNDESLIGA'
  | 'LIGUE_1'
  | 'CHAMPIONS_LEAGUE'
  | 'CONFERENCE_LEAGUE';

export interface Competition {
  id: string;
  code: CompetitionCode;
  name: string;
  apiFootballId: number;
  logoUrl: string | null;
  currentSeason: number;
}

export interface GroupCompetition {
  id: string;
  groupId: string;
  competitionId: string;
  isActive: boolean;
  competition: Competition;
}
