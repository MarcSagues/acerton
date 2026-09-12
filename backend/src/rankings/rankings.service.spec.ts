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
    matchday: {
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

describe('RankingsService.getHistoryForCompetition', () => {
  it('devuelve las jornadas finalizadas (mas reciente primero) con el ganador y los puntos del usuario que pide el historico', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'md-2', order: 2, status: 'FINISHED' },
      { id: 'md-1', order: 1, status: 'FINISHED' },
    ]);
    prisma.rankingSnapshot.findMany.mockResolvedValue([
      { matchdayId: 'md-1', userId: 'u1', points: 3, user: { name: 'Ana' } },
      { matchdayId: 'md-1', userId: 'u2', points: 5, user: { name: 'Bea' } },
      { matchdayId: 'md-2', userId: 'u1', points: 6, user: { name: 'Ana' } },
      { matchdayId: 'md-2', userId: 'u2', points: 2, user: { name: 'Bea' } },
    ]);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getHistoryForCompetition('g1', 'c1', 'u1');

    expect(prisma.matchday.findMany).toHaveBeenCalledWith({
      where: { competitionId: 'c1', status: 'FINISHED' },
      orderBy: { order: 'desc' },
    });
    expect(result.matchdays).toEqual([
      { matchdayId: 'md-2', order: 2, winner: { userId: 'u1', name: 'Ana', points: 6 }, myPoints: 6 },
      { matchdayId: 'md-1', order: 1, winner: { userId: 'u2', name: 'Bea', points: 5 }, myPoints: 3 },
    ]);
    expect(result.groupAverage).toBe((3 + 5 + 6 + 2) / 4);
    expect(result.userAverage).toBe((3 + 6) / 2);
  });

  it('myPoints es null si el usuario no tiene snapshot en esa jornada (se unio despues)', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([{ id: 'md-1', order: 1, status: 'FINISHED' }]);
    prisma.rankingSnapshot.findMany.mockResolvedValue([
      { matchdayId: 'md-1', userId: 'u2', points: 5, user: { name: 'Bea' } },
    ]);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getHistoryForCompetition('g1', 'c1', 'u1');

    expect(result.matchdays[0].myPoints).toBeNull();
    expect(result.userAverage).toBeNull();
  });

  it('devuelve listas vacias y medias null sin consultar snapshots si no hay jornadas finalizadas', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([]);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getHistoryForCompetition('g1', 'c1', 'u1');

    expect(result).toEqual({ matchdays: [], groupAverage: null, userAverage: null });
    expect(prisma.rankingSnapshot.findMany).not.toHaveBeenCalled();
  });
});
