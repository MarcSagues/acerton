import { XpService } from './xp.service';

function buildPrismaMock() {
  return {
    group: { findUnique: jest.fn() },
    groupMembership: { findMany: jest.fn() },
    matchday: { findUnique: jest.fn() },
    prediction: { findMany: jest.fn() },
    xpEvent: { createMany: jest.fn() },
    user: { update: jest.fn() },
    $transaction: jest.fn().mockResolvedValue(undefined),
  };
}

function eventTypes(prisma: ReturnType<typeof buildPrismaMock>) {
  const call = prisma.xpEvent.createMany.mock.calls[0]?.[0];
  return (call?.data ?? []).map((e: { type: string; amount: number }) => `${e.type}:${e.amount}`);
}

describe('XpService.evaluateAfterMatchdayClose', () => {
  it('no concede nada a quien no pronostico nada en esta jornada de este grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }] });
    prisma.prediction.findMany.mockResolvedValue([]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('da participacion + acierto 1X2 normal, sin bono de pleno si fallo otro partido', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 1, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 2, awayScore: 0 } },
      { pointsEarned: 0, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 1 } },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['PARTICIPATION:5', 'WIN_1X2:25']);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { experience: { increment: 30 } } });
  });

  it('el acierto con comodin de remontada en 1X2 vale menos que un acierto normal', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 1, doubleChanceOption: 'HOME_OR_DRAW', doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 1 } },
      { pointsEarned: 0, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 1 } },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['PARTICIPATION:5', 'WIN_1X2_WILDCARD:15']);
  });

  it('distingue marcador exacto de solo acertar el ganador en modo resultado exacto', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }] });
    prisma.prediction.findMany.mockResolvedValue([
      // Marcador exacto
      { pointsEarned: 5, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: 2, predictedAwayScore: 0, match: { homeScore: 2, awayScore: 0 } },
      // Solo acierta quien gana, no el marcador
      { pointsEarned: 2, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: 3, predictedAwayScore: 0, match: { homeScore: 1, awayScore: 0 } },
      // Fallo
      { pointsEarned: 0, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: 1, predictedAwayScore: 1, match: { homeScore: 0, awayScore: 2 } },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['PARTICIPATION:5', 'EXACT_SCORE_HIT:60', 'EXACT_SCORE_WINNER:25']);
  });

  it('anade el bono de pleno de jornada cuando se acierta en todos los partidos pronosticados', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }] });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 5, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: 1, predictedAwayScore: 0, match: { homeScore: 1, awayScore: 0 } },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['PARTICIPATION:5', 'EXACT_SCORE_HIT:60', 'PERFECT_MATCHDAY_EXACT:150']);
  });

  it('no da pleno si no pronostico todos los partidos de la jornada aunque acertara los que jugo', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 1, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 0 } },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['PARTICIPATION:5', 'WIN_1X2:25']);
  });

  it('devuelve quien sube de nivel en esta pasada (no cada vez que gana XP)', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    // Nivel 1 necesita 200 XP: con 190 ya acumulados, sumar 30 (participar + acierto) cruza a nivel 2.
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 190 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 1, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 0 } },
      { pointsEarned: 0, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 1 } },
    ]);

    const service = new XpService(prisma as never);
    const levelUps = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(levelUps).toEqual([{ userId: 'u1', level: 2 }]);
  });

  it('no reporta subida de nivel si la XP ganada no llega a cruzar el siguiente nivel', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 100 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }] });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 0, doubleChanceOption: null, doublePointsWildcard: null, predictedHomeScore: null, predictedAwayScore: null, match: { homeScore: 1, awayScore: 0 } },
    ]);

    const service = new XpService(prisma as never);
    const levelUps = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(levelUps).toEqual([]);
  });
});
