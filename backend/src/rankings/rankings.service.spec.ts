import { RankingsService } from './rankings.service';

function buildPrismaMock() {
  return {
    rankingSnapshot: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    groupMembership: {
      findMany: jest.fn(),
    },
  };
}

describe('RankingsService.getLatestRanking (positionDelta)', () => {
  it('compara contra la posicion 1 para todos si no hay foto anterior (primera jornada jugada)', async () => {
    const prisma = buildPrismaMock();
    prisma.rankingSnapshot.findFirst
      .mockResolvedValueOnce({ matchdayId: 'md-1' }) // latest
      .mockResolvedValueOnce(null); // sin foto anterior
    prisma.rankingSnapshot.findMany.mockResolvedValueOnce([
      { userId: 'u1', position: 1, points: 3, user: {} },
      { userId: 'u2', position: 2, points: 1, user: {} },
    ]);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getLatestRanking('g1', 'TOTAL', null);

    expect(result).toEqual([
      expect.objectContaining({ userId: 'u1', positionDelta: 0 }), // ya estaba en la 1
      expect.objectContaining({ userId: 'u2', positionDelta: -1 }), // bajo de la 1 a la 2
    ]);
  });

  it('calcula la diferencia respecto a la foto anterior cuando existe', async () => {
    const prisma = buildPrismaMock();
    prisma.rankingSnapshot.findFirst
      .mockResolvedValueOnce({ matchdayId: 'md-2' }) // latest
      .mockResolvedValueOnce({ matchdayId: 'md-1' }); // anterior
    prisma.rankingSnapshot.findMany
      .mockResolvedValueOnce([
        { userId: 'u1', position: 2, points: 3, user: {} },
        { userId: 'u2', position: 1, points: 4, user: {} },
      ])
      .mockResolvedValueOnce([
        { userId: 'u1', position: 1, points: 3 },
        { userId: 'u2', position: 2, points: 2 },
      ]);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getLatestRanking('g1', 'TOTAL', null);

    expect(result).toEqual([
      expect.objectContaining({ userId: 'u1', positionDelta: -1 }), // de la 1 a la 2: ha bajado
      expect.objectContaining({ userId: 'u2', positionDelta: 1 }), // de la 2 a la 1: ha subido
    ]);
  });
});
