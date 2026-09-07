import { rankEntries } from './rank-entries.util';

describe('rankEntries', () => {
  it('ordena de mayor a menor puntuacion', () => {
    const result = rankEntries([
      { userId: 'a', points: 3 },
      { userId: 'b', points: 7 },
      { userId: 'c', points: 5 },
    ]);
    expect(result.map((r) => r.userId)).toEqual(['b', 'c', 'a']);
  });

  it('los empates comparten posicion y la siguiente posicion salta (1,1,3)', () => {
    const result = rankEntries([
      { userId: 'a', points: 5 },
      { userId: 'b', points: 5 },
      { userId: 'c', points: 2 },
    ]);
    expect(result).toEqual([
      { userId: 'a', points: 5, position: 1 },
      { userId: 'b', points: 5, position: 1 },
      { userId: 'c', points: 2, position: 3 },
    ]);
  });

  it('devuelve lista vacia sin entradas', () => {
    expect(rankEntries([])).toEqual([]);
  });
});
