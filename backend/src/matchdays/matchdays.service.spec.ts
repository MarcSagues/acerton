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
