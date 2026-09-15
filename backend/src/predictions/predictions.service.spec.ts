import { PredictionsService } from './predictions.service';

function buildPrismaMock(predictions: unknown[]) {
  return {
    prediction: {
      findMany: jest.fn().mockResolvedValue(predictions),
      update: jest.fn().mockResolvedValue(undefined),
    },
  };
}

function buildSubmitDeps(
  match: { status: string; kickoff: Date; matchdayId?: string },
  options: { canAcceptPredictions?: boolean; scoringMode?: 'ONE_X_TWO' | 'EXACT_SCORE' } = {},
) {
  const prisma = {
    match: { findUnique: jest.fn().mockResolvedValue({ id: 'm1', matchdayId: 'md1', ...match }) },
    prediction: { upsert: jest.fn().mockResolvedValue({ id: 'p1' }) },
  };
  const wildcardsService = { assertCanUseDoubleChance: jest.fn().mockResolvedValue(undefined) };
  const groupsService = {
    assertIsMember: jest.fn().mockResolvedValue(undefined),
    getScoringMode: jest.fn().mockResolvedValue(options.scoringMode ?? 'ONE_X_TWO'),
  };
  const matchdaysService = {
    canAcceptPredictions: jest.fn().mockResolvedValue(options.canAcceptPredictions ?? true),
  };
  const service = new PredictionsService(
    prisma as never,
    wildcardsService as never,
    groupsService as never,
    matchdaysService as never,
  );
  return { service, prisma, wildcardsService, groupsService, matchdaysService };
}

describe('PredictionsService.scoreFinishedMatchday', () => {
  it('puntua solo las predicciones cuyo partido ha terminado', async () => {
    const prisma = buildPrismaMock([
      {
        id: 'p1',
        choice: 'HOME',
        doubleChanceOption: null,
        group: { scoringMode: 'ONE_X_TWO' },
        match: { status: 'FINISHED', result: 'HOME' },
      },
      {
        id: 'p2',
        choice: 'AWAY',
        doubleChanceOption: null,
        group: { scoringMode: 'ONE_X_TWO' },
        match: { status: 'FINISHED', result: 'HOME' },
      },
      {
        id: 'p3',
        choice: null,
        doubleChanceOption: 'DRAW_OR_AWAY',
        group: { scoringMode: 'ONE_X_TWO' },
        match: { status: 'FINISHED', result: 'DRAW' },
      },
      {
        id: 'p4',
        choice: 'HOME',
        doubleChanceOption: null,
        group: { scoringMode: 'ONE_X_TWO' },
        match: { status: 'LIVE', result: null },
      },
    ]);

    const service = new PredictionsService(prisma as never, {} as never, {} as never, {} as never);
    const scoredCount = await service.scoreFinishedMatchday('matchday-1');

    expect(scoredCount).toBe(3);
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { pointsEarned: 1 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p2' },
      data: { pointsEarned: 0 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p3' },
      data: { pointsEarned: 1 },
    });
    expect(prisma.prediction.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p4' } }),
    );
  });

  it('es idempotente: recalcula sobre el resultado actual sin depender de ejecuciones previas', async () => {
    const prisma = buildPrismaMock([
      {
        id: 'p1',
        choice: 'HOME',
        doubleChanceOption: null,
        group: { scoringMode: 'ONE_X_TWO' },
        match: { status: 'FINISHED', result: 'AWAY' },
      },
    ]);

    const service = new PredictionsService(prisma as never, {} as never, {} as never, {} as never);
    await service.scoreFinishedMatchday('matchday-1');
    await service.scoreFinishedMatchday('matchday-1');

    expect(prisma.prediction.update).toHaveBeenCalledTimes(2);
    expect(prisma.prediction.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'p1' },
      data: { pointsEarned: 0 },
    });
  });

  it('puntua cada prediccion segun el modo de su propio grupo, en una misma jornada con grupos mixtos', async () => {
    const prisma = buildPrismaMock([
      {
        id: 'p1',
        choice: 'HOME',
        doubleChanceOption: null,
        group: { scoringMode: 'ONE_X_TWO' },
        match: { status: 'FINISHED', result: 'HOME', homeScore: 2, awayScore: 0 },
      },
      {
        id: 'p2',
        predictedHomeScore: 2,
        predictedAwayScore: 0,
        group: { scoringMode: 'EXACT_SCORE' },
        match: { status: 'FINISHED', result: 'HOME', homeScore: 2, awayScore: 0 },
      },
      {
        id: 'p3',
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        group: { scoringMode: 'EXACT_SCORE' },
        match: { status: 'FINISHED', result: 'HOME', homeScore: 2, awayScore: 0 },
      },
      {
        id: 'p4',
        predictedHomeScore: 0,
        predictedAwayScore: 1,
        group: { scoringMode: 'EXACT_SCORE' },
        match: { status: 'FINISHED', result: 'HOME', homeScore: 2, awayScore: 0 },
      },
      {
        id: 'p5',
        predictedHomeScore: 2,
        predictedAwayScore: 0,
        doublePointsWildcard: true,
        group: { scoringMode: 'EXACT_SCORE' },
        match: { status: 'FINISHED', result: 'HOME', homeScore: 2, awayScore: 0 },
      },
      {
        id: 'p6',
        predictedHomeScore: 1,
        predictedAwayScore: 0,
        doublePointsWildcard: true,
        group: { scoringMode: 'EXACT_SCORE' },
        match: { status: 'FINISHED', result: 'HOME', homeScore: 2, awayScore: 0 },
      },
    ]);

    const service = new PredictionsService(prisma as never, {} as never, {} as never, {} as never);
    await service.scoreFinishedMatchday('matchday-1');

    expect(prisma.prediction.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { pointsEarned: 1 } });
    expect(prisma.prediction.update).toHaveBeenCalledWith({ where: { id: 'p2' }, data: { pointsEarned: 5 } });
    expect(prisma.prediction.update).toHaveBeenCalledWith({ where: { id: 'p3' }, data: { pointsEarned: 2 } });
    expect(prisma.prediction.update).toHaveBeenCalledWith({ where: { id: 'p4' }, data: { pointsEarned: 0 } });
    expect(prisma.prediction.update).toHaveBeenCalledWith({ where: { id: 'p5' }, data: { pointsEarned: 10 } });
    expect(prisma.prediction.update).toHaveBeenCalledWith({ where: { id: 'p6' }, data: { pointsEarned: 4 } });
  });
});

describe('PredictionsService.submit', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const past = new Date(Date.now() - 24 * 60 * 60 * 1000);

  it('permite predecir un partido SCHEDULED cuyo kickoff todavia no ha llegado', async () => {
    const { service, prisma } = buildSubmitDeps({ status: 'SCHEDULED', kickoff: future });

    await service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' });

    expect(prisma.prediction.upsert).toHaveBeenCalled();
  });

  it('rechaza un partido cuyo kickoff ya paso', async () => {
    const { service } = buildSubmitDeps({ status: 'SCHEDULED', kickoff: past });

    await expect(service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' })).rejects.toThrow();
  });

  it('rechaza un partido que ya no esta SCHEDULED aunque su kickoff este en el futuro (pospuesto)', async () => {
    const { service } = buildSubmitDeps({ status: 'POSTPONED', kickoff: future });

    await expect(service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' })).rejects.toThrow();
  });

  it('deja predecir un partido de la misma jornada que otro ya adelantado y jugado', async () => {
    // Escenario real: un partido de la jornada se jugo el dia 3 (ya FINISHED),
    // el resto sigue programado para el 15 — el bloqueo debe ser por partido,
    // no por jornada.
    const { service, prisma } = buildSubmitDeps({ status: 'SCHEDULED', kickoff: future });

    await service.submit('u1', 'g1', { matchId: 'm1', choice: 'AWAY' });

    expect(prisma.prediction.upsert).toHaveBeenCalled();
  });

  it('rechaza un partido de una jornada futura previsualizada (todavia no es la jornada actual)', async () => {
    const { service, prisma } = buildSubmitDeps(
      { status: 'SCHEDULED', kickoff: future },
      { canAcceptPredictions: false },
    );

    await expect(service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' })).rejects.toThrow();
    expect(prisma.prediction.upsert).not.toHaveBeenCalled();
  });

  describe('grupos en modo resultado exacto', () => {
    it('rechaza un pronostico 1X2 en un grupo de resultado exacto', async () => {
      const { service } = buildSubmitDeps(
        { status: 'SCHEDULED', kickoff: future },
        { scoringMode: 'EXACT_SCORE' },
      );

      await expect(service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' })).rejects.toThrow();
    });

    it('rechaza un resultado exacto incompleto', async () => {
      const { service } = buildSubmitDeps(
        { status: 'SCHEDULED', kickoff: future },
        { scoringMode: 'EXACT_SCORE' },
      );

      await expect(
        service.submit('u1', 'g1', { matchId: 'm1', predictedHomeScore: 2 }),
      ).rejects.toThrow();
    });

    it('acepta un resultado exacto completo y limpia choice/doubleChanceOption', async () => {
      const { service, prisma } = buildSubmitDeps(
        { status: 'SCHEDULED', kickoff: future },
        { scoringMode: 'EXACT_SCORE' },
      );

      await service.submit('u1', 'g1', { matchId: 'm1', predictedHomeScore: 2, predictedAwayScore: 1 });

      expect(prisma.prediction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            predictedHomeScore: 2,
            predictedAwayScore: 1,
            doublePointsWildcard: false,
            choice: null,
            doubleChanceOption: null,
          },
          create: expect.objectContaining({ predictedHomeScore: 2, predictedAwayScore: 1, doublePointsWildcard: false }),
        }),
      );
    });

    it('rechaza un resultado exacto en un grupo 1X2', async () => {
      const { service } = buildSubmitDeps({ status: 'SCHEDULED', kickoff: future });

      await expect(
        service.submit('u1', 'g1', { matchId: 'm1', predictedHomeScore: 2, predictedAwayScore: 1 }),
      ).rejects.toThrow();
    });

    it('con el comodin de remontada activo, comprueba el cupo y lo guarda en doublePointsWildcard', async () => {
      const { service, prisma, wildcardsService } = buildSubmitDeps(
        { status: 'SCHEDULED', kickoff: future },
        { scoringMode: 'EXACT_SCORE' },
      );

      await service.submit('u1', 'g1', {
        matchId: 'm1',
        predictedHomeScore: 2,
        predictedAwayScore: 1,
        doublePointsWildcard: true,
      });

      expect(wildcardsService.assertCanUseDoubleChance).toHaveBeenCalledWith('u1', 'g1', 'md1', 'm1');
      expect(prisma.prediction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({ doublePointsWildcard: true }),
          create: expect.objectContaining({ doublePointsWildcard: true }),
        }),
      );
    });

    it('rechaza el comodin de remontada si no quedan usos disponibles', async () => {
      const { service, wildcardsService } = buildSubmitDeps(
        { status: 'SCHEDULED', kickoff: future },
        { scoringMode: 'EXACT_SCORE' },
      );
      wildcardsService.assertCanUseDoubleChance.mockRejectedValue(new Error('sin cupo'));

      await expect(
        service.submit('u1', 'g1', {
          matchId: 'm1',
          predictedHomeScore: 2,
          predictedAwayScore: 1,
          doublePointsWildcard: true,
        }),
      ).rejects.toThrow('sin cupo');
    });
  });
});
