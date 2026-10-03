import { SeasonsService } from './seasons.service';

function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    groupSeason: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    competition: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    groupCompetition: {
      findMany: jest.fn(),
    },
    ...overrides,
  };
}

function fixture(kickoffIso: string, status: 'SCHEDULED' | 'FINISHED' | 'CANCELLED' = 'FINISHED') {
  return { kickoff: new Date(kickoffIso), status };
}

describe('SeasonsService.getOpenSeason', () => {
  it('reutiliza la temporada abierta si ya existe', async () => {
    const prisma = buildPrismaMock();
    prisma.groupSeason.findFirst.mockResolvedValue({ id: 's1', groupId: 'g1', endedAt: null });

    const service = new SeasonsService(prisma as never, {} as never);
    const season = await service.getOpenSeason('g1');

    expect(season).toEqual({ id: 's1', groupId: 'g1', endedAt: null });
    expect(prisma.groupSeason.create).not.toHaveBeenCalled();
  });

  it('crea una temporada nueva si el grupo no tiene ninguna abierta', async () => {
    const prisma = buildPrismaMock();
    prisma.groupSeason.findFirst.mockResolvedValue(null);
    prisma.groupSeason.create.mockResolvedValue({
      id: 's2',
      groupId: 'g1',
      label: '2026/27',
      endedAt: null,
    });

    const service = new SeasonsService(prisma as never, {} as never);
    const season = await service.getOpenSeason('g1');

    expect(season.id).toBe('s2');
    expect(prisma.groupSeason.create).toHaveBeenCalledWith({
      data: { groupId: 'g1', label: expect.any(String) },
    });
  });
});

describe('SeasonsService.refreshCompetitionPreview', () => {
  it('guarda la fecha del partido mas tardio y dice que no ha terminado si queda alguno pendiente', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    const footballProvider = {
      getFullSeasonMatches: jest.fn().mockResolvedValue([
        fixture('2026-08-01T18:00:00Z', 'FINISHED'),
        fixture('2027-05-20T18:00:00Z', 'SCHEDULED'), // el ultimo, todavia no jugado
      ]),
    };

    const service = new SeasonsService(prisma as never, footballProvider as never);
    const result = await service.refreshCompetitionPreview('c1');

    expect(result).toEqual({ finished: false });
    expect(prisma.competition.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { seasonEndPreviewAt: new Date('2027-05-20T18:00:00Z') },
    });
  });

  it('dice que ha terminado cuando todos los partidos estan FINISHED o CANCELLED', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    const footballProvider = {
      getFullSeasonMatches: jest
        .fn()
        .mockResolvedValue([
          fixture('2026-08-01T18:00:00Z', 'FINISHED'),
          fixture('2027-05-20T18:00:00Z', 'CANCELLED'),
        ]),
    };

    const service = new SeasonsService(prisma as never, footballProvider as never);
    const result = await service.refreshCompetitionPreview('c1');

    expect(result).toEqual({ finished: true });
  });

  it('no toca nada si el proveedor todavia no tiene calendario', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    const footballProvider = { getFullSeasonMatches: jest.fn().mockResolvedValue([]) };

    const service = new SeasonsService(prisma as never, footballProvider as never);
    const result = await service.refreshCompetitionPreview('c1');

    expect(result).toBeNull();
    expect(prisma.competition.update).not.toHaveBeenCalled();
  });
});

describe('SeasonsService.checkSeasonClosureAfterMatchdayFinished', () => {
  it('no gasta peticion al proveedor si la jornada terminada no alcanza todavia el preview conocido', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
      seasonEndPreviewAt: new Date('2027-05-20T18:00:00Z'),
    });
    const footballProvider = { getFullSeasonMatches: jest.fn() };

    const service = new SeasonsService(prisma as never, footballProvider as never);
    await service.checkSeasonClosureAfterMatchdayFinished('c1', new Date('2026-09-01T18:00:00Z'));

    expect(footballProvider.getFullSeasonMatches).not.toHaveBeenCalled();
  });

  it('no cierra la temporada del grupo si otra de sus competiciones activas todavia no ha terminado', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        externalId: 39,
        currentSeason: 2026,
        seasonEndPreviewAt: null,
      }) // trigger
      .mockResolvedValueOnce({
        id: 'c2',
        externalId: 40,
        currentSeason: 2026,
        seasonEndPreviewAt: null,
      }); // otra activa del grupo
    const footballProvider = {
      getFullSeasonMatches: jest
        .fn()
        .mockResolvedValueOnce([fixture('2027-05-20T18:00:00Z', 'FINISHED')]) // c1: terminada
        .mockResolvedValueOnce([fixture('2027-06-01T18:00:00Z', 'SCHEDULED')]), // c2: todavia no
    };
    prisma.groupCompetition.findMany
      .mockResolvedValueOnce([{ groupId: 'g1', competitionId: 'c1', isActive: true }]) // grupos con c1 activa
      .mockResolvedValueOnce([
        { groupId: 'g1', competitionId: 'c1', isActive: true },
        { groupId: 'g1', competitionId: 'c2', isActive: true },
      ]); // competiciones activas del grupo g1

    const service = new SeasonsService(prisma as never, footballProvider as never);
    await service.checkSeasonClosureAfterMatchdayFinished('c1', new Date('2027-05-20T18:00:00Z'));

    expect(prisma.groupSeason.update).not.toHaveBeenCalled();
  });

  it('cierra la temporada del grupo cuando TODAS sus competiciones activas han terminado', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique
      .mockResolvedValueOnce({
        id: 'c1',
        externalId: 39,
        currentSeason: 2026,
        seasonEndPreviewAt: null,
      })
      .mockResolvedValueOnce({
        id: 'c2',
        externalId: 40,
        currentSeason: 2026,
        seasonEndPreviewAt: null,
      });
    const footballProvider = {
      getFullSeasonMatches: jest
        .fn()
        .mockResolvedValueOnce([fixture('2027-05-20T18:00:00Z', 'FINISHED')])
        .mockResolvedValueOnce([fixture('2027-05-25T18:00:00Z', 'FINISHED')]),
    };
    prisma.groupCompetition.findMany
      .mockResolvedValueOnce([{ groupId: 'g1', competitionId: 'c1', isActive: true }])
      .mockResolvedValueOnce([
        { groupId: 'g1', competitionId: 'c1', isActive: true },
        { groupId: 'g1', competitionId: 'c2', isActive: true },
      ]);
    prisma.groupSeason.findFirst.mockResolvedValue({
      id: 's1',
      groupId: 'g1',
      label: '2026/27',
      endedAt: null,
    });

    const service = new SeasonsService(prisma as never, footballProvider as never);
    await service.checkSeasonClosureAfterMatchdayFinished('c1', new Date('2027-05-20T18:00:00Z'));

    expect(prisma.groupSeason.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { endedAt: expect.any(Date) },
    });
  });

  it('un partido aplazado (descubierto al refrescar) no cierra la temporada, solo actualiza el preview', async () => {
    const prisma = buildPrismaMock();
    // Preview anterior decia que el 20 de mayo era el ultimo, pero al refrescar aparece uno nuevo el 27.
    prisma.competition.findUnique.mockResolvedValueOnce({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
      seasonEndPreviewAt: new Date('2027-05-20T18:00:00Z'),
    });
    const footballProvider = {
      getFullSeasonMatches: jest.fn().mockResolvedValueOnce([
        fixture('2027-05-20T18:00:00Z', 'FINISHED'),
        fixture('2027-05-27T18:00:00Z', 'SCHEDULED'), // aplazado desde antes del 20, ahora es el ultimo
      ]),
    };

    const service = new SeasonsService(prisma as never, footballProvider as never);
    await service.checkSeasonClosureAfterMatchdayFinished('c1', new Date('2027-05-20T18:00:00Z'));

    expect(prisma.competition.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { seasonEndPreviewAt: new Date('2027-05-27T18:00:00Z') },
    });
    expect(prisma.groupSeason.update).not.toHaveBeenCalled();
  });
});
