import { calculatePoints, ScorablePrediction } from './scoring.util';

function prediction(overrides: Partial<ScorablePrediction>): ScorablePrediction {
  return { choice: null, doubleChanceOption: null, ...overrides };
}

describe('calculatePoints', () => {
  it('otorga 1 punto cuando el pronostico acierta el 1X2', () => {
    expect(calculatePoints(prediction({ choice: 'HOME' }), 'HOME')).toBe(1);
    expect(calculatePoints(prediction({ choice: 'DRAW' }), 'DRAW')).toBe(1);
    expect(calculatePoints(prediction({ choice: 'AWAY' }), 'AWAY')).toBe(1);
  });

  it('otorga 0 puntos cuando el pronostico falla', () => {
    expect(calculatePoints(prediction({ choice: 'HOME' }), 'AWAY')).toBe(0);
    expect(calculatePoints(prediction({ choice: 'DRAW' }), 'HOME')).toBe(0);
  });

  it('devuelve 0 si el partido todavia no tiene resultado', () => {
    expect(calculatePoints(prediction({ choice: 'HOME' }), null)).toBe(0);
  });

  describe('comodin de doble oportunidad (remontada)', () => {
    it('acierta con cualquiera de los 2 resultados cubiertos, valiendo 1 punto', () => {
      const p = prediction({ doubleChanceOption: 'HOME_OR_DRAW' });
      expect(calculatePoints(p, 'HOME')).toBe(1);
      expect(calculatePoints(p, 'DRAW')).toBe(1);
      expect(calculatePoints(p, 'AWAY')).toBe(0);
    });

    it('cubre X2 (empate o visitante)', () => {
      const p = prediction({ doubleChanceOption: 'DRAW_OR_AWAY' });
      expect(calculatePoints(p, 'DRAW')).toBe(1);
      expect(calculatePoints(p, 'AWAY')).toBe(1);
      expect(calculatePoints(p, 'HOME')).toBe(0);
    });

    it('cubre 12 (local o visitante, sin empate)', () => {
      const p = prediction({ doubleChanceOption: 'HOME_OR_AWAY' });
      expect(calculatePoints(p, 'HOME')).toBe(1);
      expect(calculatePoints(p, 'AWAY')).toBe(1);
      expect(calculatePoints(p, 'DRAW')).toBe(0);
    });

    it('devuelve 0 si el partido no ha terminado, aunque cubra el resultado', () => {
      expect(calculatePoints(prediction({ doubleChanceOption: 'HOME_OR_AWAY' }), null)).toBe(0);
    });
  });
});
