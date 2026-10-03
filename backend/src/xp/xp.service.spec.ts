import { XpService } from './xp.service';

function buildPrismaMock() {
  return {
    group: { findUnique: jest.fn() },
    groupMembership: { findMany: jest.fn() },
    matchday: { findUnique: jest.fn() },
    prediction: { findMany: jest.fn() },
    xpEvent: { createMany: jest.fn() },
    user: { update: jest.fn(), findUnique: jest.fn() },
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

  it('no concede nada si ninguna prediccion pronosticada tuvo puntos ni hubo pleno (la participacion ya se dio en tiempo real)', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 0,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 1 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('da XP de acierto 1X2 normal, sin bono de pleno si fallo otro partido', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 1,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 2, awayScore: 0 },
      },
      {
        pointsEarned: 0,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 1 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['WIN_1X2:25']);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { experience: { increment: 25 } },
    });
  });

  it('el acierto con comodin de remontada en 1X2 vale menos que un acierto normal', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 1,
        doubleChanceOption: 'HOME_OR_DRAW',
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 1 },
      },
      {
        pointsEarned: 0,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 1 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['WIN_1X2_WILDCARD:15']);
  });

  it('distingue marcador exacto de solo acertar el ganador en modo resultado exacto', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({
      matches: [{ id: 'm1' }, { id: 'm2' }, { id: 'm3' }],
    });
    prisma.prediction.findMany.mockResolvedValue([
      // Marcador exacto
      {
        pointsEarned: 5,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: 2,
        predictedAwayScore: 0,
        match: { homeScore: 2, awayScore: 0 },
      },
      // Solo acierta quien gana, no el marcador
      {
        pointsEarned: 2,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: 3,
        predictedAwayScore: 0,
        match: { homeScore: 1, awayScore: 0 },
      },
      // Fallo
      {
        pointsEarned: 0,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: 1,
        predictedAwayScore: 1,
        match: { homeScore: 0, awayScore: 2 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['EXACT_SCORE_HIT:60', 'EXACT_SCORE_WINNER:25']);
  });

  it('anade el bono de pleno con TODOS los marcadores exactos (el nivel mas dificil)', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 5,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        match: { homeScore: 1, awayScore: 0 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['EXACT_SCORE_HIT:60', 'PERFECT_MATCHDAY_ALL_EXACT:1000']);
  });

  it('anade el bono de pleno de ganadores (no PERFECT_MATCHDAY_ALL_EXACT) si algun partido solo acerto el ganador', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 5,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        match: { homeScore: 1, awayScore: 0 },
      },
      {
        pointsEarned: 2,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: 3,
        predictedAwayScore: 0,
        match: { homeScore: 1, awayScore: 0 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual([
      'EXACT_SCORE_HIT:60',
      'EXACT_SCORE_WINNER:25',
      'PERFECT_MATCHDAY_EXACT:600',
    ]);
  });

  it('anade el bono de pleno de ganadores en modo 1X2', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 1,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 0 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['WIN_1X2:25', 'PERFECT_MATCHDAY_1X2:600']);
  });

  it('no da pleno si no pronostico todos los partidos de la jornada aunque acertara los que jugo', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', user: { experience: 0 } }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 1,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 0 },
      },
    ]);

    const service = new XpService(prisma as never);
    await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['WIN_1X2:25']);
  });

  it('devuelve quien sube de nivel en esta pasada (no cada vez que gana XP)', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    // Nivel 1 necesita 200 XP: con 175 ya acumulados, sumar 25 (acierto 1X2) cruza a nivel 2.
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', user: { experience: 175 } },
    ]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 1,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 0 },
      },
      {
        pointsEarned: 0,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 1 },
      },
    ]);

    const service = new XpService(prisma as never);
    const levelUps = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(levelUps).toEqual([{ userId: 'u1', level: 2 }]);
  });

  it('no reporta subida de nivel si la XP ganada no llega a cruzar el siguiente nivel', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', user: { experience: 100 } },
    ]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockResolvedValue([
      {
        pointsEarned: 1,
        doubleChanceOption: null,
        doublePointsWildcard: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        match: { homeScore: 1, awayScore: 0 },
      },
    ]);

    const service = new XpService(prisma as never);
    const levelUps = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(levelUps).toEqual([]);
  });
});

describe('XpService.awardParticipation', () => {
  it('concede la XP de participar y devuelve null si no cruza de nivel', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ experience: 0 });

    const service = new XpService(prisma as never);
    const levelUp = await service.awardParticipation('u1', 'g1', 'md1');

    expect(eventTypes(prisma)).toEqual(['PARTICIPATION:5']);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { experience: { increment: 5 } },
    });
    expect(levelUp).toBeNull();
  });

  it('devuelve el nuevo nivel si la XP de participar cruza el siguiente nivel', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ experience: 196 });

    const service = new XpService(prisma as never);
    const levelUp = await service.awardParticipation('u1', 'g1', 'md1');

    expect(levelUp).toEqual({ userId: 'u1', level: 2 });
  });

  it('devuelve null si el usuario no existe', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue(null);

    const service = new XpService(prisma as never);
    const levelUp = await service.awardParticipation('u1', 'g1', 'md1');

    expect(levelUp).toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('XpService.awardReferral', () => {
  it('concede la XP del primer referido (500) sin groupId/matchdayId', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ experience: 0 });

    const service = new XpService(prisma as never);
    await service.awardReferral('u1', 1);

    expect(eventTypes(prisma)).toEqual(['REFERRAL:500']);
    const call = prisma.xpEvent.createMany.mock.calls[0]?.[0];
    expect(call.data[0]).toMatchObject({ groupId: null, matchdayId: null });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { experience: { increment: 500 } },
    });
  });

  it('la XP del segundo referido cae a la mitad (250)', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ experience: 0 });

    const service = new XpService(prisma as never);
    await service.awardReferral('u1', 2);

    expect(eventTypes(prisma)).toEqual(['REFERRAL:250']);
  });

  it('devuelve el nuevo nivel si el referido cruza de nivel', async () => {
    const prisma = buildPrismaMock();
    prisma.user.findUnique.mockResolvedValue({ experience: 0 });

    const service = new XpService(prisma as never);
    const levelUp = await service.awardReferral('u1', 1);

    expect(levelUp).toEqual({ userId: 'u1', level: 2 });
  });
});
