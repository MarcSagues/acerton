import {
  computeMatchResult,
  isMatchPredictable,
  parseRoundOrder,
  shouldCloseMatchday,
  shouldSendReminder,
} from './matchday.util';

describe('shouldCloseMatchday', () => {
  const now = new Date('2026-03-05T20:00:00Z');

  it('cierra una jornada OPEN cuya hora de cierre ya paso', () => {
    const matchday = { status: 'OPEN' as const, closesAt: new Date('2026-03-05T19:59:00Z') };
    expect(shouldCloseMatchday(matchday, now)).toBe(true);
  });

  it('cierra exactamente en el instante de closesAt', () => {
    const matchday = { status: 'OPEN' as const, closesAt: now };
    expect(shouldCloseMatchday(matchday, now)).toBe(true);
  });

  it('no cierra una jornada OPEN cuya hora de cierre aun no ha llegado', () => {
    const matchday = { status: 'OPEN' as const, closesAt: new Date('2026-03-05T20:01:00Z') };
    expect(shouldCloseMatchday(matchday, now)).toBe(false);
  });

  it('no vuelve a cerrar una jornada ya CLOSED', () => {
    const matchday = { status: 'CLOSED' as const, closesAt: new Date('2026-03-05T00:00:00Z') };
    expect(shouldCloseMatchday(matchday, now)).toBe(false);
  });

  it('no toca una jornada ya FINISHED', () => {
    const matchday = { status: 'FINISHED' as const, closesAt: new Date('2026-03-05T00:00:00Z') };
    expect(shouldCloseMatchday(matchday, now)).toBe(false);
  });
});

describe('computeMatchResult', () => {
  it('devuelve HOME si el local marca mas goles', () => {
    expect(computeMatchResult(2, 1)).toBe('HOME');
  });

  it('devuelve AWAY si el visitante marca mas goles', () => {
    expect(computeMatchResult(0, 3)).toBe('AWAY');
  });

  it('devuelve DRAW en caso de empate', () => {
    expect(computeMatchResult(1, 1)).toBe('DRAW');
  });

  it('devuelve null si falta algun marcador (partido no terminado)', () => {
    expect(computeMatchResult(null, null)).toBeNull();
    expect(computeMatchResult(1, null)).toBeNull();
  });
});

describe('shouldSendReminder', () => {
  const now = new Date('2026-03-05T15:00:00Z');
  const oneHourMs = 60 * 60 * 1000;

  it('avisa si el cierre cae dentro de la ventana y todavia no se ha avisado', () => {
    const matchday = {
      status: 'OPEN' as const,
      closesAt: new Date('2026-03-05T15:30:00Z'),
      reminderSentAt: null,
    };
    expect(shouldSendReminder(matchday, oneHourMs, now)).toBe(true);
  });

  it('no avisa si el cierre cae fuera de la ventana (todavia falta mucho)', () => {
    const matchday = {
      status: 'OPEN' as const,
      closesAt: new Date('2026-03-05T18:00:00Z'),
      reminderSentAt: null,
    };
    expect(shouldSendReminder(matchday, oneHourMs, now)).toBe(false);
  });

  it('no avisa si el cierre ya ha pasado', () => {
    const matchday = {
      status: 'OPEN' as const,
      closesAt: new Date('2026-03-05T14:59:00Z'),
      reminderSentAt: null,
    };
    expect(shouldSendReminder(matchday, oneHourMs, now)).toBe(false);
  });

  it('no vuelve a avisar si ese aviso ya se envio', () => {
    const matchday = {
      status: 'OPEN' as const,
      closesAt: new Date('2026-03-05T15:30:00Z'),
      reminderSentAt: new Date('2026-03-05T14:00:00Z'),
    };
    expect(shouldSendReminder(matchday, oneHourMs, now)).toBe(false);
  });

  it('no avisa si la jornada ya esta cerrada o finalizada', () => {
    const closed = {
      status: 'CLOSED' as const,
      closesAt: new Date('2026-03-05T15:30:00Z'),
      reminderSentAt: null,
    };
    expect(shouldSendReminder(closed, oneHourMs, now)).toBe(false);
  });

  it('cada aviso es independiente: la ventana de 5h no depende de la de 1h', () => {
    const matchday = {
      status: 'OPEN' as const,
      closesAt: new Date('2026-03-05T19:30:00Z'), // en 4h30, dentro de la ventana de 5h
      reminderSentAt: null,
    };
    const fiveHoursMs = 5 * 60 * 60 * 1000;
    expect(shouldSendReminder(matchday, fiveHoursMs, now)).toBe(true);
    expect(shouldSendReminder(matchday, oneHourMs, now)).toBe(false);
  });
});

describe('isMatchPredictable', () => {
  const now = new Date('2026-03-05T20:00:00Z');

  it('es predecible si esta SCHEDULED y su kickoff todavia no ha llegado', () => {
    const match = { status: 'SCHEDULED' as const, kickoff: new Date('2026-03-05T20:01:00Z') };
    expect(isMatchPredictable(match, now)).toBe(true);
  });

  it('deja de ser predecible en el instante exacto del kickoff', () => {
    const match = { status: 'SCHEDULED' as const, kickoff: now };
    expect(isMatchPredictable(match, now)).toBe(false);
  });

  it('no es predecible si su kickoff ya paso', () => {
    const match = { status: 'SCHEDULED' as const, kickoff: new Date('2026-03-05T19:59:00Z') };
    expect(isMatchPredictable(match, now)).toBe(false);
  });

  it('no es predecible si ya no esta SCHEDULED (LIVE/FINISHED/POSTPONED/CANCELLED)', () => {
    const future = new Date('2026-03-06T00:00:00Z');
    expect(isMatchPredictable({ status: 'LIVE', kickoff: future }, now)).toBe(false);
    expect(isMatchPredictable({ status: 'FINISHED', kickoff: future }, now)).toBe(false);
    expect(isMatchPredictable({ status: 'POSTPONED', kickoff: future }, now)).toBe(false);
    expect(isMatchPredictable({ status: 'CANCELLED', kickoff: future }, now)).toBe(false);
  });

  it('un partido adelantado varios dias respecto al resto de la jornada bloquea solo ese partido', () => {
    // Escenario real reportado: un partido se juega el dia 3, el resto el 15.
    const earlyMatch = { status: 'FINISHED' as const, kickoff: new Date('2026-03-03T20:00:00Z') };
    const restOfRound = { status: 'SCHEDULED' as const, kickoff: new Date('2026-03-15T20:00:00Z') };
    expect(isMatchPredictable(earlyMatch, now)).toBe(false);
    expect(isMatchPredictable(restOfRound, now)).toBe(true);
  });
});

describe('parseRoundOrder', () => {
  it('extrae el numero final del nombre de la ronda', () => {
    expect(parseRoundOrder('Regular Season - 5', 0)).toBe(5);
  });

  it('usa el indice de fallback si la ronda no tiene numero', () => {
    expect(parseRoundOrder('Round of 16', 3)).toBe(3);
  });
});
