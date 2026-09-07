import { computeNextStreak } from './streak-calculator';

describe('computeNextStreak', () => {
  it('incrementa la racha actual si el usuario participo', () => {
    expect(computeNextStreak({ currentStreak: 3, longestStreak: 5 }, true)).toEqual({
      currentStreak: 4,
      longestStreak: 5,
    });
  });

  it('rompe la racha a 0 si el usuario no participo', () => {
    expect(computeNextStreak({ currentStreak: 4, longestStreak: 5 }, false)).toEqual({
      currentStreak: 0,
      longestStreak: 5,
    });
  });

  it('actualiza la racha mas larga cuando la actual la supera', () => {
    expect(computeNextStreak({ currentStreak: 5, longestStreak: 5 }, true)).toEqual({
      currentStreak: 6,
      longestStreak: 6,
    });
  });
});
