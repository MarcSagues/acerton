import { BadRequestException } from '@nestjs/common';
import { GroupsService } from './groups.service';

function buildDeps(activeCompetitionIds: string[], prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    groupMembership: { findMany: jest.fn().mockResolvedValue([]) },
    ...prismaOverrides,
  };
  const configService = { get: jest.fn() };
  const competitionsService = {
    findActiveByGroup: jest.fn().mockResolvedValue(activeCompetitionIds.map((competitionId) => ({ competitionId }))),
    setGroupCompetitions: jest.fn().mockResolvedValue(undefined),
  };
  const matchdaysService = {
    syncCurrentRound: jest.fn().mockResolvedValue(null),
  };
  const service = new GroupsService(
    prisma as never,
    configService as never,
    competitionsService as never,
    matchdaysService as never,
  );
  return { service, competitionsService, matchdaysService, prisma };
}

describe('GroupsService.setCompetitions', () => {
  it('rechaza si el nuevo conjunto deja fuera una competicion ya activa', async () => {
    const { service, competitionsService } = buildDeps(['c1', 'c2']);

    await expect(service.setCompetitions('g1', ['c1'])).rejects.toThrow(BadRequestException);
    expect(competitionsService.setGroupCompetitions).not.toHaveBeenCalled();
  });

  it('permite anadir competiciones nuevas sin tocar las ya activas', async () => {
    const { service, competitionsService, matchdaysService } = buildDeps(['c1']);

    await service.setCompetitions('g1', ['c1', 'c2']);

    expect(competitionsService.setGroupCompetitions).toHaveBeenCalledWith('g1', ['c1', 'c2']);
    expect(matchdaysService.syncCurrentRound).toHaveBeenCalledWith('c1');
    expect(matchdaysService.syncCurrentRound).toHaveBeenCalledWith('c2');
  });

  it('permite reenviar exactamente las mismas competiciones ya activas', async () => {
    const { service, competitionsService } = buildDeps(['c1', 'c2']);

    await service.setCompetitions('g1', ['c1', 'c2']);

    expect(competitionsService.setGroupCompetitions).toHaveBeenCalledWith('g1', ['c1', 'c2']);
  });

  it('rechaza una lista vacia incluso sin competiciones activas todavia', async () => {
    const { service, competitionsService } = buildDeps([]);

    await expect(service.setCompetitions('g1', [])).rejects.toThrow(BadRequestException);
    expect(competitionsService.setGroupCompetitions).not.toHaveBeenCalled();
  });
});

function buildGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    name: 'Grupo test',
    description: null,
    isPublic: true,
    inviteCode: 'SECRETO',
    ownerId: 'owner1',
    scoringMode: 'ONE_X_TWO',
    comebackEnabled: true,
    comebackPointsPerBonus: 6,
    createdAt: new Date('2026-01-01'),
    deletedAt: null,
    _count: { memberships: 4 },
    groupCompetitions: [
      {
        competitionId: 'c1',
        isActive: true,
        competition: { id: 'c1', code: 'LA_LIGA', name: 'LaLiga', logoUrl: null },
      },
    ],
    ...overrides,
  };
}

describe('GroupsService.searchPublicGroups', () => {
  it('filtra por deletedAt null e isPublic true, sin exponer inviteCode ni ownerId', async () => {
    const findMany = jest.fn().mockResolvedValue([buildGroup()]);
    const { service } = buildDeps([], { group: { findMany } });

    const result = await service.searchPublicGroups({}, 'user1');

    expect(findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null, isPublic: true });
    expect(result.items[0]).not.toHaveProperty('inviteCode');
    expect(result.items[0]).not.toHaveProperty('ownerId');
    expect(result.items[0].memberCount).toBe(4);
    expect(result.items[0].competitions).toEqual([{ id: 'c1', code: 'LA_LIGA', name: 'LaLiga', logoUrl: null }]);
  });

  it('marca isMember segun si el usuario pertenece a cada grupo devuelto', async () => {
    const findMany = jest.fn().mockResolvedValue([buildGroup({ id: 'g1' }), buildGroup({ id: 'g2' })]);
    const membershipFindMany = jest.fn().mockResolvedValue([{ groupId: 'g1' }]);
    const { service } = buildDeps([], { group: { findMany }, groupMembership: { findMany: membershipFindMany } });

    const result = await service.searchPublicGroups({}, 'user1');

    expect(membershipFindMany).toHaveBeenCalledWith({
      where: { userId: 'user1', groupId: { in: ['g1', 'g2'] } },
      select: { groupId: true },
    });
    expect(result.items.find((item) => item.id === 'g1')?.isMember).toBe(true);
    expect(result.items.find((item) => item.id === 'g2')?.isMember).toBe(false);
  });

  it('exige que el grupo cumpla TODAS las ligas seleccionadas (una condicion AND por liga)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = buildDeps([], { group: { findMany } });

    await service.searchPublicGroups({ competitionIds: ['c1', 'c2'] }, 'user1');

    expect(findMany.mock.calls[0][0].where.AND).toEqual([
      { groupCompetitions: { some: { competitionId: 'c1', isActive: true } } },
      { groupCompetitions: { some: { competitionId: 'c2', isActive: true } } },
    ]);
  });

  it('pagina por cursor: pide uno de mas para saber si hay siguiente pagina', async () => {
    const threeGroups = [buildGroup({ id: 'g1' }), buildGroup({ id: 'g2' }), buildGroup({ id: 'g3' })];
    const findMany = jest.fn().mockResolvedValue(threeGroups);
    const { service } = buildDeps([], { group: { findMany } });

    const result = await service.searchPublicGroups({ limit: 2 }, 'user1');

    expect(findMany.mock.calls[0][0].take).toBe(3);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('g2');
  });

  it('no devuelve cursor cuando no hay mas paginas', async () => {
    const findMany = jest.fn().mockResolvedValue([buildGroup({ id: 'g1' })]);
    const { service } = buildDeps([], { group: { findMany } });

    const result = await service.searchPublicGroups({ limit: 20 }, 'user1');

    expect(result.nextCursor).toBeNull();
  });
});

describe('GroupsService.findPublicGroupById', () => {
  it('filtra por id, deletedAt null e isPublic true', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const { service } = buildDeps([], { group: { findFirst } });

    const result = await service.findPublicGroupById('g1');

    expect(result).toBeNull();
    expect(findFirst.mock.calls[0][0].where).toMatchObject({ id: 'g1', deletedAt: null, isPublic: true });
  });

  it('devuelve el grupo con sus competiciones activas y el conteo de miembros cuando existe', async () => {
    const group = buildGroup();
    const findFirst = jest.fn().mockResolvedValue(group);
    const { service } = buildDeps([], { group: { findFirst } });

    const result = await service.findPublicGroupById('g1');

    expect(result).toBe(group);
  });
});

describe('GroupsService.findMineForUser', () => {
  function buildOwnGroup(overrides: Record<string, unknown> = {}) {
    return {
      id: 'g1',
      scoringMode: 'ONE_X_TWO',
      groupCompetitions: [{ competitionId: 'c1', isActive: true, competition: {} }],
      ...overrides,
    };
  }

  function buildFindMineDeps(matchday: unknown, predictions: unknown[] = [], groupOverrides: Record<string, unknown> = {}) {
    const prisma = {
      group: { findMany: jest.fn().mockResolvedValue([buildOwnGroup(groupOverrides)]) },
      rankingSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
      prediction: { findMany: jest.fn().mockResolvedValue(predictions) },
    };
    const configService = { get: jest.fn() };
    const competitionsService = { findActiveByGroup: jest.fn() };
    const matchdaysService = {
      getCurrentMatchdayForCompetition: jest.fn().mockResolvedValue(matchday),
    };
    const service = new GroupsService(
      prisma as never,
      configService as never,
      competitionsService as never,
      matchdaysService as never,
    );
    return { service, prisma };
  }

  const openMatchday = (matches: unknown[]) => ({
    id: 'md1',
    status: 'OPEN',
    canPredict: true,
    opensAt: new Date(Date.now() - 1000).toISOString(),
    matches,
  });

  const futureMatch = { id: 'm1', status: 'SCHEDULED', kickoff: new Date(Date.now() + 3600_000) };

  it('marca hasPendingPicks a true si hay un partido futuro sin pronosticar', async () => {
    const { service } = buildFindMineDeps(openMatchday([futureMatch]), []);

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(true);
  });

  it('marca hasPendingPicks a false si ya se pronostico ese partido', async () => {
    const { service } = buildFindMineDeps(openMatchday([futureMatch]), [
      { matchId: 'm1', choice: 'HOME', doubleChanceOption: null },
    ]);

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(false);
  });

  it('marca hasPendingPicks a false si el partido ya empezo (bloqueado)', async () => {
    const startedMatch = { id: 'm1', status: 'SCHEDULED', kickoff: new Date(Date.now() - 1000) };
    const { service } = buildFindMineDeps(openMatchday([startedMatch]), []);

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(false);
  });

  it('marca hasPendingPicks a false si la jornada aun no puede recibir pronosticos', async () => {
    const matchday = { ...openMatchday([futureMatch]), canPredict: false };
    const { service } = buildFindMineDeps(matchday, []);

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(false);
  });

  it('marca hasPendingPicks a false si la jornada ya esta finalizada', async () => {
    const matchday = { ...openMatchday([futureMatch]), status: 'FINISHED' };
    const { service } = buildFindMineDeps(matchday, []);

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(false);
  });

  it('sin ninguna jornada abierta para la competicion, hasPendingPicks es false', async () => {
    const { service } = buildFindMineDeps(null, []);

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(false);
  });

  it('en modo EXACT_SCORE exige ambos marcadores para no quedar pendiente', async () => {
    const { service } = buildFindMineDeps(
      openMatchday([futureMatch]),
      [{ matchId: 'm1', predictedHomeScore: 1, predictedAwayScore: null }],
      { scoringMode: 'EXACT_SCORE' },
    );

    const [result] = await service.findMineForUser('u1');

    expect(result.hasPendingPicks).toBe(true);
  });
});
