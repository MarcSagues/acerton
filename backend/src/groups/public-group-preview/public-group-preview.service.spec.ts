import { NotFoundException } from '@nestjs/common';
import { PublicGroupPreviewService } from './public-group-preview.service';

function buildGroup(overrides: Record<string, unknown> = {}) {
  return {
    id: 'g1',
    name: 'Grupo test',
    description: null,
    scoringMode: 'ONE_X_TWO',
    comebackEnabled: true,
    comebackPointsPerBonus: 6,
    createdAt: new Date('2026-01-01'),
    _count: { memberships: 4 },
    groupCompetitions: [
      { competitionId: 'c1', isActive: true, competition: { id: 'c1', code: 'LA_LIGA', name: 'LaLiga', logoUrl: null } },
    ],
    ...overrides,
  };
}

function buildDeps() {
  const groupsService = { findPublicGroupById: jest.fn(), isGroupMember: jest.fn().mockResolvedValue(false) };
  const rankingsService = { hasRanking: jest.fn(), getLatestRanking: jest.fn() };
  const service = new PublicGroupPreviewService(groupsService as never, rankingsService as never);
  return { service, groupsService, rankingsService };
}

describe('PublicGroupPreviewService.getPreview', () => {
  it('rechaza un grupo que no existe, es privado o esta eliminado', async () => {
    const { service, groupsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(null);

    await expect(service.getPreview('g1', 'user1')).rejects.toThrow(NotFoundException);
  });

  it('devuelve el top vacio si todavia no hay clasificacion calculada, sin pedirla', async () => {
    const { service, groupsService, rankingsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(buildGroup());
    rankingsService.hasRanking.mockResolvedValue(false);

    const preview = await service.getPreview('g1', 'user1');

    expect(preview.topRanking).toEqual([]);
    expect(rankingsService.getLatestRanking).not.toHaveBeenCalled();
  });

  it('usa la competicion unica como scope si el grupo solo tiene una activa, y recorta el top a 5', async () => {
    const { service, groupsService, rankingsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(buildGroup());
    rankingsService.hasRanking.mockResolvedValue(true);
    const rows = Array.from({ length: 8 }, (_, i) => ({
      userId: `u${i}`,
      user: { name: `User ${i}` },
      position: i + 1,
      points: 10 - i,
    }));
    rankingsService.getLatestRanking.mockResolvedValue(rows);

    const preview = await service.getPreview('g1', 'user1');

    expect(rankingsService.hasRanking).toHaveBeenCalledWith('g1', 'TOTAL', 'c1');
    expect(rankingsService.getLatestRanking).toHaveBeenCalledWith('g1', 'TOTAL', 'c1');
    expect(preview.topRanking).toHaveLength(5);
    expect(preview.topRanking[0]).toEqual({ userId: 'u0', name: 'User 0', position: 1, points: 10 });
  });

  it('usa el scope general (null) cuando el grupo tiene varias competiciones activas', async () => {
    const { service, groupsService, rankingsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(
      buildGroup({
        groupCompetitions: [
          { competitionId: 'c1', isActive: true, competition: { id: 'c1', code: 'LA_LIGA', name: 'LaLiga', logoUrl: null } },
          {
            competitionId: 'c2',
            isActive: true,
            competition: { id: 'c2', code: 'PREMIER_LEAGUE', name: 'Premier', logoUrl: null },
          },
        ],
      }),
    );
    rankingsService.hasRanking.mockResolvedValue(false);

    await service.getPreview('g1', 'user1');

    expect(rankingsService.hasRanking).toHaveBeenCalledWith('g1', 'TOTAL', null);
  });

  it('oculta comebackPointsPerBonus en modo resultado exacto', async () => {
    const { service, groupsService, rankingsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(
      buildGroup({ scoringMode: 'EXACT_SCORE', comebackEnabled: false }),
    );
    rankingsService.hasRanking.mockResolvedValue(false);

    const preview = await service.getPreview('g1', 'user1');

    expect(preview.comebackPointsPerBonus).toBeNull();
  });

  it('oculta comebackPointsPerBonus si el comodin esta desactivado en 1X2', async () => {
    const { service, groupsService, rankingsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(buildGroup({ comebackEnabled: false }));
    rankingsService.hasRanking.mockResolvedValue(false);

    const preview = await service.getPreview('g1', 'user1');

    expect(preview.comebackPointsPerBonus).toBeNull();
  });

  it('incluye comebackPointsPerBonus si el comodin esta activo en 1X2', async () => {
    const { service, groupsService, rankingsService } = buildDeps();
    groupsService.findPublicGroupById.mockResolvedValue(buildGroup({ comebackEnabled: true, comebackPointsPerBonus: 8 }));
    rankingsService.hasRanking.mockResolvedValue(false);

    const preview = await service.getPreview('g1', 'user1');

    expect(preview.comebackPointsPerBonus).toBe(8);
  });
});
