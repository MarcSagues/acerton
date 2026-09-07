import { WildcardsService } from './wildcards.service';

function buildDeps(
  group: { comebackEnabled: boolean; comebackPointsPerBonus: number } | null,
  groupCompetitions: { competitionId: string }[],
  rankingRows: { userId: string; points: number }[],
  predictionCount = 0,
) {
  const prisma = {
    group: {
      findUnique: jest.fn().mockResolvedValue(group),
    },
    groupCompetition: {
      findMany: jest.fn().mockResolvedValue(groupCompetitions),
    },
    prediction: {
      count: jest.fn().mockResolvedValue(predictionCount),
    },
  };
  const rankingsService = {
    getLatestRanking: jest.fn().mockResolvedValue(rankingRows),
  };
  const service = new WildcardsService(prisma as never, rankingsService as never);
  return { service, prisma, rankingsService };
}

describe('WildcardsService.getComebackStatus', () => {
  it('gap 0 y allowance 0 si el grupo todavia no tiene ninguna competicion activa', async () => {
    const { service } = buildDeps({ comebackEnabled: true, comebackPointsPerBonus: 6 }, [], []);

    const status = await service.getComebackStatus('u1', 'g1');

    expect(status).toMatchObject({ gap: 0, allowance: 0 });
  });

  it('gap 0 si todavia no hay clasificacion calculada', async () => {
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );

    const status = await service.getComebackStatus('u1', 'g1');

    expect(status.gap).toBe(0);
  });

  it('calcula el gap respecto al lider y el allowance segun comebackPointsPerBonus', async () => {
    const rows = [
      { userId: 'u2', points: 20 },
      { userId: 'u1', points: 8 },
    ]; // gap = 12
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      rows,
    );

    const status = await service.getComebackStatus('u1', 'g1');

    expect(status.gap).toBe(12);
    expect(status.allowance).toBe(2); // floor(12/6)
  });

  it('el usuario en cabeza (o sin filas propias) tiene gap 0', async () => {
    const rows = [{ userId: 'u2', points: 20 }]; // u1 no aparece
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      rows,
    );

    const status = await service.getComebackStatus('u2', 'g1');

    expect(status.gap).toBe(0);
  });

  it('allowance 0 si el comodin esta desactivado en el grupo, aunque el gap sea grande', async () => {
    const rows = [
      { userId: 'u2', points: 30 },
      { userId: 'u1', points: 0 },
    ];
    const { service } = buildDeps(
      { comebackEnabled: false, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      rows,
    );

    const status = await service.getComebackStatus('u1', 'g1');

    expect(status.enabled).toBe(false);
    expect(status.allowance).toBe(0);
  });

  it('usa el ranking general (competitionId null) cuando el grupo tiene mas de una competicion activa', async () => {
    const { service, rankingsService } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }, { competitionId: 'c2' }],
      [{ userId: 'u1', points: 1 }],
    );

    await service.getComebackStatus('u1', 'g1');

    expect(rankingsService.getLatestRanking).toHaveBeenCalledWith('g1', 'TOTAL', null);
  });

  it('usa el ranking de la unica competicion activa cuando solo hay una', async () => {
    const { service, rankingsService } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [{ userId: 'u1', points: 1 }],
    );

    await service.getComebackStatus('u1', 'g1');

    expect(rankingsService.getLatestRanking).toHaveBeenCalledWith('g1', 'TOTAL', 'c1');
  });

  it('remaining descuenta los usos ya hechos en la jornada consultada', async () => {
    const rows = [
      { userId: 'u2', points: 20 },
      { userId: 'u1', points: 2 },
    ]; // gap = 18, allowance = 3
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      rows,
      2,
    );

    const status = await service.getComebackStatus('u1', 'g1', 'md1');

    expect(status.allowance).toBe(3);
    expect(status.used).toBe(2);
    expect(status.remaining).toBe(1);
  });

  it('remaining nunca es negativo si used supera al allowance', async () => {
    const rows = [
      { userId: 'u2', points: 20 },
      { userId: 'u1', points: 18 },
    ]; // gap = 2, allowance = 0
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      rows,
      1,
    );

    const status = await service.getComebackStatus('u1', 'g1', 'md1');

    expect(status.remaining).toBe(0);
  });
});

describe('WildcardsService.assertCanUseDoubleChance', () => {
  it('rechaza si el comodin esta desactivado en el grupo', async () => {
    const { service } = buildDeps(
      { comebackEnabled: false, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [
        { userId: 'u2', points: 30 },
        { userId: 'u1', points: 0 },
      ],
    );

    await expect(service.assertCanUseDoubleChance('u1', 'g1', 'md1', 'm1')).rejects.toThrow();
  });

  it('rechaza si no quedan usos disponibles', async () => {
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [
        { userId: 'u2', points: 10 },
        { userId: 'u1', points: 8 },
      ], // gap 2, allowance 0
    );

    await expect(service.assertCanUseDoubleChance('u1', 'g1', 'md1', 'm1')).rejects.toThrow();
  });

  it('permite el uso si hay allowance suficiente', async () => {
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [
        { userId: 'u2', points: 20 },
        { userId: 'u1', points: 0 },
      ], // gap 20, allowance 3
    );

    await expect(
      service.assertCanUseDoubleChance('u1', 'g1', 'md1', 'm1'),
    ).resolves.toBeUndefined();
  });
});
