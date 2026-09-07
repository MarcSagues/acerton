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
  options: { canAcceptPredictions?: boolean } = {},
) {
  const prisma = {
    match: { findUnique: jest.fn().mockResolvedValue({ id: 'm1', matchdayId: 'md1', ...match }) },
    prediction: { upsert: jest.fn().mockResolvedValue({ id: 'p1' }) },
  };
  const wildcardsService = { assertCanUseDoubleChance: jest.fn().mockResolvedValue(undefined) };
  const groupsService = { assertIsMember: jest.fn().mockResolvedValue(undefined) };
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
        match: { status: 'FINISHED', result: 'HOME' },
      },
      {
        id: 'p2',
        choice: 'AWAY',
        doubleChanceOption: null,
        match: { status: 'FINISHED', result: 'HOME' },
      },
      {
        id: 'p3',
        choice: null,
        doubleChanceOption: 'DRAW_OR_AWAY',
        match: { status: 'FINISHED', result: 'DRAW' },
      },
      {
        id: 'p4',
        choice: 'HOME',
        doubleChanceOption: null,
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
});
