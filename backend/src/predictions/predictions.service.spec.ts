import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
  options: {
    canAcceptPredictions?: boolean;
    scoringMode?: 'ONE_X_TWO' | 'EXACT_SCORE';
    /** null (por defecto) = primer pronostico de este partido; un objeto = ya existia (solo se esta editando). */
    existingPrediction?: unknown;
  } = {},
) {
  const prisma = {
    match: { findUnique: jest.fn().mockResolvedValue({ id: 'm1', matchdayId: 'md1', ...match }) },
    prediction: {
      upsert: jest.fn().mockResolvedValue({ id: 'p1' }),
      findUnique: jest.fn().mockResolvedValue(options.existingPrediction ?? null),
    },
  };
  const wildcardsService = { assertCanUseDoubleChance: jest.fn().mockResolvedValue(undefined) };
  const groupsService = {
    assertIsMember: jest.fn().mockResolvedValue(undefined),
    getScoringMode: jest.fn().mockResolvedValue(options.scoringMode ?? 'ONE_X_TWO'),
  };
  const matchdaysService = {
    canAcceptPredictions: jest.fn().mockResolvedValue(options.canAcceptPredictions ?? true),
  };
  const xpService = { awardParticipation: jest.fn().mockResolvedValue(null) };
  const notificationsService = { notifyLevelUp: jest.fn().mockResolvedValue(undefined) };
  const service = new PredictionsService(
    prisma as never,
    wildcardsService as never,
    groupsService as never,
    matchdaysService as never,
    xpService as never,
    notificationsService as never,
  );
  return {
    service,
    prisma,
    wildcardsService,
    groupsService,
    matchdaysService,
    xpService,
    notificationsService,
  };
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

    const service = new PredictionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
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

    const service = new PredictionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
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

    const service = new PredictionsService(
      prisma as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await service.scoreFinishedMatchday('matchday-1');

    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p1' },
      data: { pointsEarned: 1 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p2' },
      data: { pointsEarned: 5 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p3' },
      data: { pointsEarned: 2 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p4' },
      data: { pointsEarned: 0 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p5' },
      data: { pointsEarned: 10 },
    });
    expect(prisma.prediction.update).toHaveBeenCalledWith({
      where: { id: 'p6' },
      data: { pointsEarned: 4 },
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

      await service.submit('u1', 'g1', {
        matchId: 'm1',
        predictedHomeScore: 2,
        predictedAwayScore: 1,
      });

      expect(prisma.prediction.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            predictedHomeScore: 2,
            predictedAwayScore: 1,
            doublePointsWildcard: false,
            choice: null,
            doubleChanceOption: null,
          },
          create: expect.objectContaining({
            predictedHomeScore: 2,
            predictedAwayScore: 1,
            doublePointsWildcard: false,
          }),
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

      expect(wildcardsService.assertCanUseDoubleChance).toHaveBeenCalledWith(
        'u1',
        'g1',
        'md1',
        'm1',
      );
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

  describe('XP de participacion en tiempo real', () => {
    it('concede XP al pronosticar un partido por primera vez', async () => {
      const { service, xpService } = buildSubmitDeps({ status: 'SCHEDULED', kickoff: future });

      await service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' });

      expect(xpService.awardParticipation).toHaveBeenCalledWith('u1', 'g1', 'md1');
    });

    it('no vuelve a conceder XP si ya existia un pronostico para ese partido (solo se cambia el valor)', async () => {
      const { service, xpService } = buildSubmitDeps(
        { status: 'SCHEDULED', kickoff: future },
        { existingPrediction: { id: 'p0' } },
      );

      await service.submit('u1', 'g1', { matchId: 'm1', choice: 'AWAY' });

      expect(xpService.awardParticipation).not.toHaveBeenCalled();
    });

    it('si subir de nivel al participar, avisa por notificacion de subida de nivel', async () => {
      const { service, xpService, notificationsService } = buildSubmitDeps({
        status: 'SCHEDULED',
        kickoff: future,
      });
      xpService.awardParticipation.mockResolvedValue({ userId: 'u1', level: 5 });

      await service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' });

      expect(notificationsService.notifyLevelUp).toHaveBeenCalledWith('u1', 5);
    });

    it('un fallo al conceder XP no impide guardar el pronostico', async () => {
      const { service, prisma, xpService } = buildSubmitDeps({
        status: 'SCHEDULED',
        kickoff: future,
      });
      xpService.awardParticipation.mockRejectedValue(new Error('DB caida'));

      await expect(service.submit('u1', 'g1', { matchId: 'm1', choice: 'HOME' })).resolves.toEqual({
        id: 'p1',
      });
      expect(prisma.prediction.upsert).toHaveBeenCalled();
    });
  });
});

/** Dos grupos del mismo usuario con la misma competicion; los partidos 1-3 son de la jornada md1. */
function buildCopyDeps(
  options: {
    sourceMode?: 'ONE_X_TWO' | 'EXACT_SCORE';
    targetMode?: 'ONE_X_TWO' | 'EXACT_SCORE';
    sourcePredictions?: unknown[];
    competitionActive?: boolean;
    canAccept?: boolean;
    sourceGroupExists?: boolean;
  } = {},
) {
  const deps = buildSubmitDeps(
    { status: 'SCHEDULED', kickoff: new Date(Date.now() + 3600_000) },
    { scoringMode: options.targetMode ?? 'ONE_X_TWO', canAcceptPredictions: options.canAccept },
  );
  const prisma = deps.prisma as unknown as Record<string, Record<string, jest.Mock>>;
  prisma.matchday = {
    findUnique: jest.fn().mockResolvedValue({ id: 'md1', competitionId: 'c1' }),
  };
  prisma.groupCompetition = {
    findFirst: jest
      .fn()
      .mockResolvedValue(options.competitionActive === false ? null : { id: 'gc' }),
  };
  prisma.group = {
    findFirst: jest
      .fn()
      .mockResolvedValue(
        options.sourceGroupExists === false
          ? null
          : { scoringMode: options.sourceMode ?? 'ONE_X_TWO' },
      ),
  };
  prisma.prediction.findMany = jest.fn().mockResolvedValue(options.sourcePredictions ?? []);
  const submit = jest
    .spyOn(deps.service, 'submit')
    .mockImplementation(async (_u, _g, dto) => ({ id: `saved-${dto.matchId}`, ...dto }) as never);
  return { ...deps, prisma, submit };
}

const FUTURE = () => new Date(Date.now() + 3600_000);
const PAST = () => new Date(Date.now() - 3600_000);

function sourcePick(matchId: string, extra: Record<string, unknown> = {}, kickoff = FUTURE()) {
  return {
    matchId,
    choice: null,
    doubleChanceOption: null,
    predictedHomeScore: null,
    predictedAwayScore: null,
    doublePointsWildcard: false,
    match: { id: matchId, status: 'SCHEDULED', kickoff },
    ...extra,
  };
}

describe('PredictionsService.copyFromGroup', () => {
  it('copia todos los pronosticos abiertos del origen al destino con submit() (mismas reglas que a mano)', async () => {
    const { service, submit, prisma } = buildCopyDeps({
      sourcePredictions: [
        sourcePick('m1', { choice: 'HOME' }),
        sourcePick('m2', { choice: 'DRAW' }),
        sourcePick('m3', { choice: 'AWAY' }),
      ],
    });

    const result = await service.copyFromGroup('u1', 'target', 'source', 'md1');

    expect(submit.mock.calls.map(([, groupId, dto]) => [groupId, dto])).toEqual([
      ['target', { matchId: 'm1', choice: 'HOME' }],
      ['target', { matchId: 'm2', choice: 'DRAW' }],
      ['target', { matchId: 'm3', choice: 'AWAY' }],
    ]);
    expect(result.copied).toHaveLength(3);
    expect(result.skipped).toEqual([]);
    expect(result.wildcardsDropped).toEqual([]);
    // Lee del grupo de origen, de ese usuario y esa jornada, en orden de kickoff.
    expect(prisma.prediction.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', groupId: 'source', match: { matchdayId: 'md1' } },
      include: { match: true },
      orderBy: { match: { kickoff: 'asc' } },
    });
  });

  it('un partido que ya ha empezado no se copia y se informa como LOCKED', async () => {
    const { service, submit } = buildCopyDeps({
      sourcePredictions: [
        sourcePick('m1', { choice: 'HOME' }, PAST()),
        sourcePick('m2', { choice: 'DRAW' }),
      ],
    });

    const result = await service.copyFromGroup('u1', 'target', 'source', 'md1');

    expect(submit).toHaveBeenCalledTimes(1);
    expect(result.copied).toHaveLength(1);
    expect(result.skipped).toEqual([{ matchId: 'm1', reason: 'LOCKED' }]);
  });

  it('entre grupos de distinto modo se rechaza (en los dos sentidos) sin tocar nada', async () => {
    for (const [sourceMode, targetMode] of [
      ['ONE_X_TWO', 'EXACT_SCORE'],
      ['EXACT_SCORE', 'ONE_X_TWO'],
    ] as const) {
      const { service, submit } = buildCopyDeps({
        sourceMode,
        targetMode,
        sourcePredictions: [sourcePick('m1', { choice: 'HOME' })],
      });

      await expect(service.copyFromGroup('u1', 'target', 'source', 'md1')).rejects.toThrow(
        /mismo modo de juego/,
      );
      expect(submit).not.toHaveBeenCalled();
    }
  });

  it('doble oportunidad: se copia si el destino tiene comodin; si no, se omite como WILDCARD_UNAVAILABLE y el resto sigue', async () => {
    const { service, submit, wildcardsService } = buildCopyDeps({
      sourcePredictions: [
        sourcePick('m1', { doubleChanceOption: 'HOME_OR_DRAW' }),
        sourcePick('m2', { doubleChanceOption: 'DRAW_OR_AWAY' }),
        sourcePick('m3', { choice: 'AWAY' }),
      ],
    });
    // Solo queda un comodin en el destino: el primero lo gasta, el segundo ya no.
    wildcardsService.assertCanUseDoubleChance
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new ForbiddenException('No te quedan comodines'));

    const result = await service.copyFromGroup('u1', 'target', 'source', 'md1');

    expect(submit.mock.calls.map(([, , dto]) => dto)).toEqual([
      { matchId: 'm1', doubleChanceOption: 'HOME_OR_DRAW' },
      { matchId: 'm3', choice: 'AWAY' },
    ]);
    expect(result.skipped).toEqual([{ matchId: 'm2', reason: 'WILDCARD_UNAVAILABLE' }]);
    expect(wildcardsService.assertCanUseDoubleChance).toHaveBeenCalledWith(
      'u1',
      'target',
      'md1',
      'm1',
    );
  });

  it('resultado exacto con "x2": sin comodin en el destino se copia el marcador sin duplicador y se avisa', async () => {
    const { service, submit, wildcardsService } = buildCopyDeps({
      sourceMode: 'EXACT_SCORE',
      targetMode: 'EXACT_SCORE',
      sourcePredictions: [
        sourcePick('m1', {
          predictedHomeScore: 2,
          predictedAwayScore: 2,
          doublePointsWildcard: true,
        }),
      ],
    });
    wildcardsService.assertCanUseDoubleChance.mockRejectedValue(
      new ForbiddenException('desactivado'),
    );

    const result = await service.copyFromGroup('u1', 'target', 'source', 'md1');

    expect(submit).toHaveBeenCalledWith('u1', 'target', {
      matchId: 'm1',
      predictedHomeScore: 2,
      predictedAwayScore: 2,
      doublePointsWildcard: false,
    });
    expect(result.wildcardsDropped).toEqual(['m1']);
  });

  it('no consulta el comodin del destino cuando el pronostico no usa ninguno', async () => {
    const { service, wildcardsService } = buildCopyDeps({
      sourcePredictions: [sourcePick('m1', { choice: 'HOME' })],
    });

    await service.copyFromGroup('u1', 'target', 'source', 'md1');

    expect(wildcardsService.assertCanUseDoubleChance).not.toHaveBeenCalled();
  });

  it('si submit() falla en un partido (empezo entre medias, error...), el resto se sigue copiando y se informa', async () => {
    const { service, submit } = buildCopyDeps({
      sourcePredictions: [
        sourcePick('m1', { choice: 'HOME' }),
        sourcePick('m2', { choice: 'DRAW' }),
        sourcePick('m3', { choice: 'AWAY' }),
      ],
    });
    submit
      .mockRejectedValueOnce(new ForbiddenException('Este partido ya ha empezado'))
      .mockRejectedValueOnce(new Error('boom'))
      .mockImplementation(async (_u, _g, dto) => ({ id: `saved-${dto.matchId}` }) as never);

    const result = await service.copyFromGroup('u1', 'target', 'source', 'md1');

    expect(result.skipped).toEqual([
      { matchId: 'm1', reason: 'LOCKED' },
      { matchId: 'm2', reason: 'FAILED' },
    ]);
    expect(result.copied).toHaveLength(1);
  });

  it('origen y destino iguales -> 400 sin consultar nada', async () => {
    const { service, groupsService } = buildCopyDeps();
    await expect(service.copyFromGroup('u1', 'g1', 'g1', 'md1')).rejects.toThrow(
      BadRequestException,
    );
    expect(groupsService.assertIsMember).not.toHaveBeenCalled();
  });

  it('exige ser miembro de AMBOS grupos', async () => {
    const { service, groupsService, submit } = buildCopyDeps({
      sourcePredictions: [sourcePick('m1', { choice: 'HOME' })],
    });
    groupsService.assertIsMember.mockImplementation(async (groupId: string) => {
      if (groupId === 'source') throw new ForbiddenException('No perteneces a este grupo');
    });

    await expect(service.copyFromGroup('u1', 'target', 'source', 'md1')).rejects.toThrow(
      ForbiddenException,
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it('rechaza una jornada que no es de una competicion activa del destino, o que aun no admite pronosticos', async () => {
    const notActive = buildCopyDeps({ competitionActive: false });
    await expect(notActive.service.copyFromGroup('u1', 'target', 'source', 'md1')).rejects.toThrow(
      /competición activa/,
    );

    const closed = buildCopyDeps({ canAccept: false });
    await expect(closed.service.copyFromGroup('u1', 'target', 'source', 'md1')).rejects.toThrow(
      /Todavía no se puede predecir/,
    );
    expect(closed.submit).not.toHaveBeenCalled();
  });

  it('un grupo de origen eliminado o inexistente -> 404', async () => {
    const { service } = buildCopyDeps({ sourceGroupExists: false });
    await expect(service.copyFromGroup('u1', 'target', 'source', 'md1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sin pronosticos en el origen no copia nada (resultado vacio, no error)', async () => {
    const { service, submit } = buildCopyDeps({ sourcePredictions: [] });
    await expect(service.copyFromGroup('u1', 'target', 'source', 'md1')).resolves.toEqual({
      copied: [],
      skipped: [],
      wildcardsDropped: [],
    });
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('PredictionsService.getCopySources', () => {
  function build(rows: unknown[], targetMode: 'ONE_X_TWO' | 'EXACT_SCORE' = 'ONE_X_TWO') {
    const deps = buildCopyDeps({ targetMode });
    deps.prisma.prediction.findMany.mockResolvedValue(rows);
    return deps;
  }
  const row = (
    groupId: string,
    name: string,
    scoringMode: string,
    kickoff = FUTURE(),
    status = 'SCHEDULED',
  ) => ({ groupId, group: { name, scoringMode }, match: { status, kickoff } });

  it('agrupa por grupo y cuenta solo los pronosticos que siguen abiertos; los grupos sin ninguno abierto no salen', async () => {
    const { service } = build([
      row('gA', 'Amigos', 'ONE_X_TWO'),
      row('gA', 'Amigos', 'ONE_X_TWO'),
      row('gA', 'Amigos', 'ONE_X_TWO', PAST()),
      row('gB', 'Trabajo', 'ONE_X_TWO'),
      row('gC', 'Empezados', 'ONE_X_TWO', PAST()),
      row('gD', 'Terminados', 'ONE_X_TWO', FUTURE(), 'FINISHED'),
    ]);

    const sources = await service.getCopySources('u1', 'target', 'md1');

    expect(sources).toEqual([
      {
        groupId: 'gA',
        name: 'Amigos',
        scoringMode: 'ONE_X_TWO',
        copyableCount: 2,
      },
      {
        groupId: 'gB',
        name: 'Trabajo',
        scoringMode: 'ONE_X_TWO',
        copyableCount: 1,
      },
    ]);
  });

  it('solo ofrece grupos del mismo modo que el actual: la consulta filtra por el modo del destino, sea cual sea', async () => {
    for (const targetMode of ['ONE_X_TWO', 'EXACT_SCORE'] as const) {
      const { service, prisma } = build([], targetMode);
      await service.getCopySources('u1', 'target', 'md1');
      expect(prisma.prediction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            group: expect.objectContaining({ scoringMode: targetMode }),
          }),
        }),
      );
    }
  });

  it('ordena por mas pronosticos copiables y luego por nombre', async () => {
    const { service } = build([
      row('gB', 'Beta', 'ONE_X_TWO'),
      row('gA', 'Alfa', 'ONE_X_TWO'),
      row('gC', 'Gamma', 'ONE_X_TWO'),
      row('gC', 'Gamma', 'ONE_X_TWO'),
    ]);
    expect((await service.getCopySources('u1', 'target', 'md1')).map((s) => s.name)).toEqual([
      'Gamma',
      'Alfa',
      'Beta',
    ]);
  });

  it('solo busca en OTROS grupos de los que el usuario sigue siendo miembro y que no estan eliminados', async () => {
    const { service, prisma } = build([]);
    await service.getCopySources('u1', 'target', 'md1');
    expect(prisma.prediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'u1',
          groupId: { not: 'target' },
          match: { matchdayId: 'md1' },
          group: {
            deletedAt: null,
            scoringMode: 'ONE_X_TWO',
            memberships: { some: { userId: 'u1' } },
          },
        },
      }),
    );
  });

  it('exige ser miembro del grupo actual y que la jornada sea de una competicion activa suya', async () => {
    const { service, groupsService } = build([]);
    groupsService.assertIsMember.mockRejectedValue(
      new ForbiddenException('No perteneces a este grupo'),
    );
    await expect(service.getCopySources('u1', 'target', 'md1')).rejects.toThrow(ForbiddenException);

    const notActive = buildCopyDeps({ competitionActive: false });
    await expect(notActive.service.getCopySources('u1', 'target', 'md1')).rejects.toThrow(
      /competición activa/,
    );
  });
});
