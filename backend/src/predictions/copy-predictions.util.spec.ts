import { canCopyBetweenModes, planCopy, CopyablePrediction } from './copy-predictions.util';

function pick(partial: Partial<CopyablePrediction>): CopyablePrediction {
  return {
    choice: null,
    doubleChanceOption: null,
    predictedHomeScore: null,
    predictedAwayScore: null,
    doublePointsWildcard: false,
    ...partial,
  };
}

describe('canCopyBetweenModes', () => {
  it('mismo modo siempre; de resultado exacto a 1X2 si; de 1X2 a resultado exacto no', () => {
    expect(canCopyBetweenModes('ONE_X_TWO', 'ONE_X_TWO')).toBe(true);
    expect(canCopyBetweenModes('EXACT_SCORE', 'EXACT_SCORE')).toBe(true);
    expect(canCopyBetweenModes('EXACT_SCORE', 'ONE_X_TWO')).toBe(true);
    expect(canCopyBetweenModes('ONE_X_TWO', 'EXACT_SCORE')).toBe(false);
  });
});

describe('planCopy: 1X2 -> 1X2', () => {
  it('copia la eleccion simple tal cual', () => {
    expect(planCopy(pick({ choice: 'DRAW' }), 'ONE_X_TWO', 'ONE_X_TWO', false)).toEqual({
      submission: { choice: 'DRAW' },
      wildcardDropped: false,
    });
  });

  it('copia la doble oportunidad solo si el destino tiene comodin disponible', () => {
    const p = pick({ doubleChanceOption: 'HOME_OR_DRAW' });
    expect(planCopy(p, 'ONE_X_TWO', 'ONE_X_TWO', true)).toEqual({
      submission: { doubleChanceOption: 'HOME_OR_DRAW' },
      wildcardDropped: false,
    });
    // Sin comodin no hay un 1X2 simple equivalente: se omite, no se inventa una eleccion.
    expect(planCopy(p, 'ONE_X_TWO', 'ONE_X_TWO', false)).toEqual({ skip: 'WILDCARD_UNAVAILABLE' });
  });

  it('un pronostico sin eleccion alguna no se puede copiar', () => {
    expect(planCopy(pick({}), 'ONE_X_TWO', 'ONE_X_TWO', true)).toEqual({ skip: 'FAILED' });
  });
});

describe('planCopy: resultado exacto -> resultado exacto', () => {
  const exact = { predictedHomeScore: 2, predictedAwayScore: 1 };

  it('copia el marcador', () => {
    expect(planCopy(pick(exact), 'EXACT_SCORE', 'EXACT_SCORE', false)).toEqual({
      submission: { predictedHomeScore: 2, predictedAwayScore: 1, doublePointsWildcard: false },
      wildcardDropped: false,
    });
  });

  it('mantiene el "x2 puntos" si el destino puede usarlo; si no, copia el marcador sin el y lo avisa', () => {
    const p = pick({ ...exact, doublePointsWildcard: true });
    expect(planCopy(p, 'EXACT_SCORE', 'EXACT_SCORE', true)).toEqual({
      submission: { predictedHomeScore: 2, predictedAwayScore: 1, doublePointsWildcard: true },
      wildcardDropped: false,
    });
    expect(planCopy(p, 'EXACT_SCORE', 'EXACT_SCORE', false)).toEqual({
      submission: { predictedHomeScore: 2, predictedAwayScore: 1, doublePointsWildcard: false },
      wildcardDropped: true,
    });
  });

  it('copia el 0-0 (un cero no es "sin marcador")', () => {
    expect(
      planCopy(
        pick({ predictedHomeScore: 0, predictedAwayScore: 0 }),
        'EXACT_SCORE',
        'EXACT_SCORE',
        false,
      ),
    ).toMatchObject({ submission: { predictedHomeScore: 0, predictedAwayScore: 0 } });
  });

  it('un marcador a medias no se puede copiar', () => {
    expect(planCopy(pick({ predictedHomeScore: 1 }), 'EXACT_SCORE', 'EXACT_SCORE', false)).toEqual({
      skip: 'FAILED',
    });
  });
});

describe('planCopy: resultado exacto -> 1X2', () => {
  it('saca el 1X2 del marcador', () => {
    const to = (h: number, a: number) =>
      planCopy(
        pick({ predictedHomeScore: h, predictedAwayScore: a }),
        'EXACT_SCORE',
        'ONE_X_TWO',
        false,
      );
    expect(to(2, 1)).toEqual({ submission: { choice: 'HOME' }, wildcardDropped: false });
    expect(to(1, 1)).toEqual({ submission: { choice: 'DRAW' }, wildcardDropped: false });
    expect(to(0, 3)).toEqual({ submission: { choice: 'AWAY' }, wildcardDropped: false });
    expect(to(0, 0)).toEqual({ submission: { choice: 'DRAW' }, wildcardDropped: false });
  });

  it('el "x2 puntos" no tiene equivalente en 1X2: se descarta y se avisa, aunque haya comodin', () => {
    const p = pick({ predictedHomeScore: 2, predictedAwayScore: 0, doublePointsWildcard: true });
    expect(planCopy(p, 'EXACT_SCORE', 'ONE_X_TWO', true)).toEqual({
      submission: { choice: 'HOME' },
      wildcardDropped: true,
    });
  });
});

describe('planCopy: 1X2 -> resultado exacto', () => {
  it('no hay marcador que copiar', () => {
    expect(planCopy(pick({ choice: 'HOME' }), 'ONE_X_TWO', 'EXACT_SCORE', true)).toEqual({
      skip: 'FAILED',
    });
  });
});
