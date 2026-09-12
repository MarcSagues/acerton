import { BadRequestException } from '@nestjs/common';
import { GroupsService } from './groups.service';

function buildDeps(activeCompetitionIds: string[], prismaOverrides: Record<string, unknown> = {}) {
  const prisma = { ...prismaOverrides };
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

    const result = await service.searchPublicGroups({});

    expect(findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null, isPublic: true });
    expect(result.items[0]).not.toHaveProperty('inviteCode');
    expect(result.items[0]).not.toHaveProperty('ownerId');
    expect(result.items[0].memberCount).toBe(4);
    expect(result.items[0].competitions).toEqual([{ id: 'c1', code: 'LA_LIGA', name: 'LaLiga', logoUrl: null }]);
  });

  it('exige que el grupo cumpla TODAS las ligas seleccionadas (una condicion AND por liga)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = buildDeps([], { group: { findMany } });

    await service.searchPublicGroups({ competitionIds: ['c1', 'c2'] });

    expect(findMany.mock.calls[0][0].where.AND).toEqual([
      { groupCompetitions: { some: { competitionId: 'c1', isActive: true } } },
      { groupCompetitions: { some: { competitionId: 'c2', isActive: true } } },
    ]);
  });

  it('pagina por cursor: pide uno de mas para saber si hay siguiente pagina', async () => {
    const threeGroups = [buildGroup({ id: 'g1' }), buildGroup({ id: 'g2' }), buildGroup({ id: 'g3' })];
    const findMany = jest.fn().mockResolvedValue(threeGroups);
    const { service } = buildDeps([], { group: { findMany } });

    const result = await service.searchPublicGroups({ limit: 2 });

    expect(findMany.mock.calls[0][0].take).toBe(3);
    expect(result.items).toHaveLength(2);
    expect(result.nextCursor).toBe('g2');
  });

  it('no devuelve cursor cuando no hay mas paginas', async () => {
    const findMany = jest.fn().mockResolvedValue([buildGroup({ id: 'g1' })]);
    const { service } = buildDeps([], { group: { findMany } });

    const result = await service.searchPublicGroups({ limit: 20 });

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
