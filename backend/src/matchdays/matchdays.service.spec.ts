import { MatchdaysService } from './matchdays.service';

function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    matchday: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    competition: {
      findUnique: jest.fn(),
    },
    ...overrides,
  };
}

describe('MatchdaysService.closeDueMatchdays', () => {
  it('cierra solo las jornadas cuyo cierre ya paso y deja las demas intactas', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'due-1', status: 'OPEN', closesAt: new Date('2026-03-05T19:00:00Z') },
      { id: 'due-2', status: 'SCHEDULED', closesAt: new Date('2026-03-05T20:00:00Z') },
      { id: 'not-due', status: 'OPEN', closesAt: new Date('2026-03-05T21:00:00Z') },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    const closedIds = await service.closeDueMatchdays(now);

    expect(closedIds.sort()).toEqual(['due-1', 'due-2']);
    expect(prisma.matchday.update).toHaveBeenCalledTimes(2);
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'due-1' },
      data: { status: 'CLOSED' },
    });
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'due-2' },
      data: { status: 'CLOSED' },
    });
  });

  it('no actualiza nada si ninguna jornada ha llegado a su cierre', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'not-due', status: 'OPEN', closesAt: new Date('2026-03-05T21:00:00Z') },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    const closedIds = await service.closeDueMatchdays(now);

    expect(closedIds).toEqual([]);
    expect(prisma.matchday.update).not.toHaveBeenCalled();
  });
});

describe('MatchdaysService.syncCurrentRound (ahorro de cupo de API)', () => {
  it('no llama al proveedor si ya hay una jornada vigente para la temporada actual', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      currentSeason: 2025,
      externalId: 39,
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-1', status: 'OPEN' });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesByIds: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.syncCurrentRound('c1');

    expect(result).toEqual({ id: 'md-1', status: 'OPEN' });
    expect(footballProvider.getCurrentRoundFixtures).not.toHaveBeenCalled();
  });

  it('llama al proveedor si no hay ninguna jornada vigente (nueva o recien terminada la anterior)', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      currentSeason: 2025,
      externalId: 39,
    });
    prisma.matchday.findFirst.mockResolvedValue(null);
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn().mockResolvedValue([]),
      getFixturesByIds: jest.fn(),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    await service.syncCurrentRound('c1');

    expect(footballProvider.getCurrentRoundFixtures).toHaveBeenCalledWith(39, 2025);
  });
});

describe('MatchdaysService.getAdjacentMatchday', () => {
  function byId(rows: Record<string, unknown>) {
    return jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(rows[where.id] ?? null),
    );
  }

  it('anterior: devuelve la jornada con el order inmediatamente menor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      previous: { id: 'previous', competitionId: 'c1', order: 4, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'previous' });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'previous');

    expect(result).toMatchObject({ id: 'previous' });
    expect(prisma.matchday.findFirst).toHaveBeenCalledWith({
      where: { competitionId: 'c1', order: { lt: 5 } },
      orderBy: { order: 'desc' },
    });
  });

  it('anterior: null si ya es la primera jornada de la competicion', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({ current: { id: 'current', competitionId: 'c1', order: 1 } });
    prisma.matchday.findFirst.mockResolvedValue(null);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'previous');

    expect(result).toBeNull();
  });

  it('anterior: si no esta sincronizada y no es la primera, la sincroniza bajo demanda pidiendo order-1 al proveedor, y la crea como FINISHED si ya se jugo', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 6 },
      'new-md': { id: 'new-md', competitionId: 'c1', order: 5, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue(null); // no hay anterior ya sincronizada
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    prisma.matchday.upsert.mockResolvedValue({ id: 'new-md' });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesForRound: jest.fn().mockResolvedValue([
        {
          fixtureId: 1,
          round: 'Regular Season - 5',
          kickoff: new Date('2026-02-01T20:00:00Z'),
          homeTeam: { name: 'A', logoUrl: null },
          awayTeam: { name: 'B', logoUrl: null },
          status: 'FINISHED',
          homeGoals: 2,
          awayGoals: 1,
        },
      ]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'previous');

    expect(footballProvider.getFixturesForRound).toHaveBeenCalledWith(39, 2026, 5);
    expect(result).toMatchObject({ id: 'new-md' });
    expect(prisma.matchday.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'FINISHED' }),
      }),
    );
  });

  it('siguiente: si ya existe en BBDD, la devuelve sin llamar al proveedor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      next: { id: 'next', competitionId: 'c1', order: 6, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'next' });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'next');

    expect(result).toMatchObject({ id: 'next' });
    expect(footballProvider.getFixturesForRound).not.toHaveBeenCalled();
  });

  it('siguiente: si no existe todavia, la sincroniza bajo demanda pidiendo order+1 al proveedor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      'new-md': { id: 'new-md', competitionId: 'c1', order: 6, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue(null); // no hay siguiente ya sincronizada
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    prisma.matchday.upsert.mockResolvedValue({ id: 'new-md' });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesForRound: jest.fn().mockResolvedValue([
        {
          fixtureId: 1,
          round: 'Regular Season - 6',
          kickoff: new Date('2026-04-01T20:00:00Z'),
          homeTeam: { name: 'A', logoUrl: null },
          awayTeam: { name: 'B', logoUrl: null },
          status: 'SCHEDULED',
          homeGoals: null,
          awayGoals: null,
        },
      ]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'next');

    expect(footballProvider.getFixturesForRound).toHaveBeenCalledWith(39, 2026, 6);
    expect(result).toMatchObject({ id: 'new-md' });
  });

  it('siguiente: null si el proveedor no devuelve nada para esa jornada todavia', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({ current: { id: 'current', competitionId: 'c1', order: 5 } });
    prisma.matchday.findFirst.mockResolvedValue(null);
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesForRound: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'next');

    expect(result).toBeNull();
    expect(prisma.matchday.upsert).not.toHaveBeenCalled();
  });
});

describe('MatchdaysService.getCurrentMatchdayForCompetition', () => {
  it('elige la jornada de numero mas bajo entre las no finalizadas, no la de cierre mas proximo', async () => {
    // Escenario real: un partido aplazado hace que la jornada 6 (order 6)
    // cierre antes que la 5 (order 5), pero la 5 todavia no se ha jugado —
    // debe seguir siendo "la actual" a mostrar, no la 6.
    const prisma = buildPrismaMock();
    prisma.matchday.findFirst.mockResolvedValue({ id: 'jornada-5', order: 5, closesAt: new Date() });

    const service = new MatchdaysService(prisma as never, {} as never);
    const result = await service.getCurrentMatchdayForCompetition('c1');

    expect(result).toMatchObject({ id: 'jornada-5' });
    expect(prisma.matchday.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { order: 'asc' } }),
    );
  });

  it('si todas estan finalizadas, devuelve la ultima jugada', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findFirst
      .mockResolvedValueOnce(null) // no hay ninguna pendiente
      .mockResolvedValueOnce({ id: 'jornada-4', closesAt: new Date() });

    const service = new MatchdaysService(prisma as never, {} as never);
    const result = await service.getCurrentMatchdayForCompetition('c1');

    expect(result).toMatchObject({ id: 'jornada-4' });
  });
});

describe('MatchdaysService.canAcceptPredictions', () => {
  it('false si la jornada ya esta FINISHED', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({ id: 'md1', status: 'FINISHED', closesAt: new Date() });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md1')).toBe(false);
  });

  it('false si su numero de jornada es mayor que el de la actual (previsualizacion "siguiente")', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-next',
      competitionId: 'c1',
      status: 'OPEN',
      order: 7,
      closesAt: new Date(),
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-current', order: 6 }); // la jornada 6 sigue siendo la actual
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-next')).toBe(false);
  });

  it('true si su numero de jornada es menor que el de la actual (se quedo atras por un aplazamiento, no es "futura")', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-behind',
      competitionId: 'c1',
      status: 'OPEN',
      order: 5,
      closesAt: new Date(),
    });
    // La jornada 6 cierra antes (closesAt mas proximo) porque la 5 se aplazo, pero eso no la hace "futura".
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-current', order: 6 });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-behind')).toBe(true);
  });

  it('true si es ella misma la jornada actual', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: new Date(),
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-current', order: 6 });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });

  it('true si no hay ninguna jornada pendiente en su competicion', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: new Date(),
    });
    prisma.matchday.findFirst.mockResolvedValue(null);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });

  it('false si su primer partido esta a mas de 4 dias, aunque le toque por orden', async () => {
    const prisma = buildPrismaMock();
    const inSixDays = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: inSixDays,
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-current', order: 6 });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(false);
  });

  it('true si su primer partido esta a menos de 4 dias', async () => {
    const prisma = buildPrismaMock();
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: inTwoDays,
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-current', order: 6 });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });
});

describe('MatchdaysService.syncResultsForClosedMatchdays (una sola tanda de peticiones)', () => {
  it('no llama al proveedor si no hay jornadas cerradas', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesByIds: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.syncResultsForClosedMatchdays();

    expect(result).toEqual([]);
    expect(footballProvider.getFixturesByIds).not.toHaveBeenCalled();
  });

  it('junta los partidos pendientes de varias jornadas en una unica llamada al proveedor', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      {
        id: 'md-1',
        matches: [{ externalId: 1, status: 'LIVE', kickoff: new Date('2026-03-05T18:00:00Z') }],
      },
      {
        id: 'md-2',
        matches: [
          {
            externalId: 2,
            status: 'SCHEDULED',
            kickoff: new Date('2026-03-05T19:00:00Z'),
          },
        ],
      },
    ]);
    prisma.match.findMany.mockResolvedValue([{ status: 'FINISHED' }]);
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesByIds: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    await service.syncResultsForClosedMatchdays();

    expect(footballProvider.getFixturesByIds).toHaveBeenCalledTimes(1);
    expect(footballProvider.getFixturesByIds).toHaveBeenCalledWith([1, 2]);

    jest.useRealTimers();
  });

  it('no pregunta por partidos cuyo kickoff todavia no ha llegado', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      {
        id: 'md-1',
        matches: [
          {
            externalId: 1,
            status: 'SCHEDULED',
            kickoff: new Date('2026-03-05T21:00:00Z'),
          },
        ],
      },
    ]);
    prisma.match.findMany.mockResolvedValue([{ status: 'SCHEDULED' }]);
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesByIds: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    await service.syncResultsForClosedMatchdays();

    expect(footballProvider.getFixturesByIds).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('marca la jornada como FINISHED solo cuando todos sus partidos han terminado', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      {
        id: 'md-1',
        matches: [{ externalId: 1, status: 'FINISHED', kickoff: new Date('2020-01-01') }],
      },
      {
        id: 'md-2',
        matches: [{ externalId: 2, status: 'FINISHED', kickoff: new Date('2020-01-01') }],
      },
    ]);
    prisma.match.findMany.mockImplementation(({ where }: { where: { matchdayId: string } }) =>
      Promise.resolve(
        where.matchdayId === 'md-1'
          ? [{ status: 'FINISHED' }]
          : [{ status: 'FINISHED' }, { status: 'LIVE' }],
      ),
    );
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesByIds: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const finished = await service.syncResultsForClosedMatchdays();

    expect(finished).toEqual(['md-1']);
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'md-1' },
      data: { status: 'FINISHED' },
    });
    expect(prisma.matchday.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'md-2' } }),
    );
  });
});
