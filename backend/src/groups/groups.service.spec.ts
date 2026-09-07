import { BadRequestException } from '@nestjs/common';
import { GroupsService } from './groups.service';

function buildDeps(activeCompetitionIds: string[]) {
  const prisma = {};
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
  return { service, competitionsService, matchdaysService };
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
