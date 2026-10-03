export type RankingPeriod = 'WEEKLY' | 'TOTAL';

export interface RankingRow {
  id: string;
  groupId: string;
  competitionId: string | null;
  matchdayId: string;
  period: RankingPeriod;
  userId: string;
  points: number;
  position: number;
  /** Diferencia de posicion respecto a la foto anterior: positivo = ha subido, negativo = ha bajado, 0 = igual. */
  positionDelta: number;
  user: { id: string; name: string; avatarUrl: string | null; avatarBackground: string | null; level: number };
}

export interface MatchdayHistoryEntry {
  matchdayId: string;
  order: number;
  winner: { userId: string; name: string; points: number } | null;
  /** null si el usuario no tenia pronostico en esa jornada (se unio despues). */
  myPoints: number | null;
}

export interface CompetitionHistory {
  matchdays: MatchdayHistoryEntry[];
  groupAverage: number | null;
  userAverage: number | null;
}
