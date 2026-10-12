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
    group: {
      findUnique: jest.fn(),
    },
    prediction: {
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
      {
        matchdayId: 'md-2',
        order: 2,
        winner: { userId: 'u1', name: 'Ana', points: 6 },
        myPoints: 6,
        scores: [
          { userId: 'u1', name: 'Ana', points: 6 },
          { userId: 'u2', name: 'Bea', points: 2 },
        ],
      },
      {
        matchdayId: 'md-1',
        order: 1,
        winner: { userId: 'u2', name: 'Bea', points: 5 },
        myPoints: 3,
        scores: [
          { userId: 'u1', name: 'Ana', points: 3 },
          { userId: 'u2', name: 'Bea', points: 5 },
        ],
      },
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
describe('RankingsService.getExactScoreLeaders', () => {
  const user = (id: string) => ({
    id,
    name: id.toUpperCase(),
    avatarUrl: null,
    avatarBackground: null,
    experience: 0,
  });
  const member = (id: string) => ({ userId: id, user: user(id) });
  const pick = (
    userId: string,
    home: number,
    away: number,
    real: [number | null, number | null],
  ) => ({
    userId,
    predictedHomeScore: home,
    predictedAwayScore: away,
    match: { homeScore: real[0], awayScore: real[1] },
  });

  it('en un grupo de 1X2 devuelve una lista vacia sin consultar pronosticos', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getExactScoreLeaders('g1', 'TOTAL', 'c1');

    expect(result).toEqual([]);
    expect(prisma.prediction.findMany).not.toHaveBeenCalled();
  });

  it('cuenta solo los marcadores clavados, lista a todos los miembros y los empates comparten puesto', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.prediction.findMany.mockResolvedValue([
      pick('u1', 2, 1, [2, 1]), // exacto
      pick('u1', 1, 0, [2, 0]), // solo ganador: no cuenta
      pick('u2', 0, 0, [0, 0]), // exacto
      pick('u2', 3, 3, [1, 1]), // empate sin marcador: no cuenta
      pick('u3', 1, 1, [null, null]), // sin marcador real: no cuenta
      pick('ex', 2, 1, [2, 1]), // ya no es miembro: no sale
    ]);
    prisma.groupMembership.findMany.mockResolvedValue([member('u1'), member('u2'), member('u3')]);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getExactScoreLeaders('g1', 'TOTAL', 'c1');

    expect(prisma.prediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          groupId: 'g1',
          match: { status: 'FINISHED', matchday: { competitionId: 'c1' } },
        }),
      }),
    );
    expect(result.map((r) => [r.userId, r.exactHits, r.position])).toEqual([
      ['u1', 1, 1],
      ['u2', 1, 1],
      ['u3', 0, 3],
    ]);
    expect(result[0].user).toEqual(expect.objectContaining({ name: 'U1', level: 1 }));
  });

  it('en total "general" cuenta los partidos de todas las competiciones del grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.groupMembership.findMany.mockResolvedValue([member('u1')]);

    const service = new RankingsService(prisma as never, {} as never);
    await service.getExactScoreLeaders('g1', 'TOTAL', null);

    expect(prisma.prediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ match: { status: 'FINISHED' } }),
      }),
    );
  });

  it('en semanal sin jornada usa la de la ultima clasificacion semanal de la competicion', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.rankingSnapshot.findFirst.mockResolvedValue({ matchdayId: 'md-7' });
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.groupMembership.findMany.mockResolvedValue([member('u1')]);

    const service = new RankingsService(prisma as never, {} as never);
    await service.getExactScoreLeaders('g1', 'WEEKLY', 'c1');

    expect(prisma.rankingSnapshot.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { groupId: 'g1', period: 'WEEKLY', competitionId: 'c1' } }),
    );
    expect(prisma.prediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ match: { matchdayId: 'md-7', status: 'FINISHED' } }),
      }),
    );
  });

  it('en semanal con jornada elegida cuenta los partidos de esa jornada', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.groupMembership.findMany.mockResolvedValue([member('u1')]);

    const service = new RankingsService(prisma as never, {} as never);
    await service.getExactScoreLeaders('g1', 'WEEKLY', 'c1', 'md-3');

    expect(prisma.rankingSnapshot.findFirst).not.toHaveBeenCalled();
    expect(prisma.prediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ match: { matchdayId: 'md-3', status: 'FINISHED' } }),
      }),
    );
  });

  it('en semanal sin ninguna jornada jugada todavia devuelve una lista vacia', async () => {
    const prisma = buildPrismaMock();
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    prisma.rankingSnapshot.findFirst.mockResolvedValue(null);

    const service = new RankingsService(prisma as never, {} as never);
    const result = await service.getExactScoreLeaders('g1', 'WEEKLY', 'c1');

    expect(result).toEqual([]);
    expect(prisma.prediction.findMany).not.toHaveBeenCalled();
  });
});
