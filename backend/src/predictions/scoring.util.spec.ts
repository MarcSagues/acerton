import { calculateExactScorePoints, calculatePoints, ScorablePrediction } from './scoring.util';

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

describe('calculateExactScorePoints', () => {
  it('otorga 5 puntos por marcador exacto', () => {
    expect(calculateExactScorePoints({ predictedHomeScore: 2, predictedAwayScore: 0 }, 2, 0)).toBe(5);
  });

  it('otorga 2 puntos por acertar solo el ganador', () => {
    expect(calculateExactScorePoints({ predictedHomeScore: 2, predictedAwayScore: 0 }, 3, 1)).toBe(2);
  });

  it('un empate previsto vale 2 puntos si el resultado real tambien es empate, aunque el marcador no coincida', () => {
    expect(calculateExactScorePoints({ predictedHomeScore: 1, predictedAwayScore: 1 }, 2, 2)).toBe(2);
  });

  it('otorga 0 puntos si falla el ganador', () => {
    expect(calculateExactScorePoints({ predictedHomeScore: 2, predictedAwayScore: 0 }, 0, 1)).toBe(0);
    expect(calculateExactScorePoints({ predictedHomeScore: 1, predictedAwayScore: 1 }, 2, 0)).toBe(0);
  });

  it('devuelve 0 si el partido todavia no tiene resultado', () => {
    expect(calculateExactScorePoints({ predictedHomeScore: 2, predictedAwayScore: 0 }, null, null)).toBe(0);
  });

  it('devuelve 0 si falta la prediccion', () => {
    expect(calculateExactScorePoints({ predictedHomeScore: null, predictedAwayScore: null }, 2, 0)).toBe(0);
    expect(calculateExactScorePoints({ predictedHomeScore: 2, predictedAwayScore: null }, 2, 0)).toBe(0);
  });
});
