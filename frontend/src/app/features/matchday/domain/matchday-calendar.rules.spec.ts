import { MatchdaySummary } from '../../../core/models/matchday.model';
import { currentMatchdayId, matchdayCellState } from './matchday-calendar.rules';

const summary = (
  id: string,
  status: MatchdaySummary['status'],
  points: number | null = null,
): MatchdaySummary => ({ id, status, points, order: 1, closesAt: '2026-09-11T00:00:00.000Z' });

describe('matchday calendar rules', () => {
  it('selects the first unfinished matchday as the active one', () => {
    expect(
      currentMatchdayId([
        summary('finished', 'FINISHED', 4),
        summary('open', 'OPEN'),
        summary('future', 'SCHEDULED'),
      ]),
    ).toBe('open');
  });

  it('falls back to the last matchday when all are finished', () => {
    expect(currentMatchdayId([summary('one', 'FINISHED', 2), summary('two', 'FINISHED', 0)])).toBe('two');
    expect(currentMatchdayId([])).toBeNull();
  });

  it('classifies participation before active and future states', () => {
    expect(matchdayCellState(summary('played', 'FINISHED', 0), 'played')).toBe('played');
    expect(matchdayCellState(summary('open', 'OPEN'), 'open')).toBe('open');
    expect(matchdayCellState(summary('future', 'SCHEDULED'), 'open')).toBe('upcoming');
  });
});
