import { MatchdaySummary } from '../../../core/models/matchday.model';

export type MatchdayCellState = 'played' | 'open' | 'upcoming';

export function currentMatchdayId(matchdays: MatchdaySummary[]): string | null {
  return matchdays.find((matchday) => matchday.status !== 'FINISHED')?.id ?? matchdays.at(-1)?.id ?? null;
}

export function matchdayCellState(
  matchday: MatchdaySummary,
  activeMatchdayId: string | null,
): MatchdayCellState {
  if (matchday.points !== null) return 'played';
  if (matchday.id === activeMatchdayId) return 'open';
  return 'upcoming';
}
