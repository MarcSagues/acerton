import { scoringModeLabel, scoringRules } from './scoring-rules';

describe('scoring rules', () => {
  it('keeps exact-score rewards at 5, 2 and 0 points', () => {
    expect(scoringRules('EXACT_SCORE').map((rule) => rule.points)).toEqual([5, 2, 0]);
    expect(scoringModeLabel('EXACT_SCORE')).toBe('Resultado exacto');
  });

  it('keeps 1X2 rewards at 1 and 0 points', () => {
    expect(scoringRules('ONE_X_TWO').map((rule) => rule.points)).toEqual([1, 0]);
    expect(scoringModeLabel('ONE_X_TWO')).toBe('Quiniela 1X2');
  });
});
