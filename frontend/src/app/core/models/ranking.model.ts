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
  user: { id: string; name: string; avatarUrl: string | null };
}
