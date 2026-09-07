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
      previous: { id: 'previous', competitionId: 'c1', order: 4, matches: [] },
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

  it('siguiente: si ya existe en BBDD, la devuelve sin llamar al proveedor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      next: { id: 'next', competitionId: 'c1', order: 6, matches: [] },
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
      'new-md': { id: 'new-md', competitionId: 'c1', order: 6, matches: [] },
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
