import { WildcardsService } from './wildcards.service';

function buildDeps(
  group: {
    comebackEnabled: boolean;
    comebackPointsPerBonus: number;
    scoringMode?: 'ONE_X_TWO' | 'EXACT_SCORE';
  } | null,
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
      findFirst: jest.fn().mockResolvedValue(groupCompetitions[0] ?? null),
    },
    prediction: {
      count: jest.fn().mockResolvedValue(predictionCount),
    },
    adRewardClaim: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
    },
    matchday: {
      findUnique: jest.fn().mockResolvedValue({ status: 'OPEN', competitionId: 'c1' }),
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

  it('en grupos EXACT_SCORE cuenta los usos por doublePointsWildcard en vez de doubleChanceOption', async () => {
    const rows = [
      { userId: 'u2', points: 20 },
      { userId: 'u1', points: 2 },
    ];
    const { service, prisma } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6, scoringMode: 'EXACT_SCORE' },
      [{ competitionId: 'c1' }],
      rows,
      1,
    );

    await service.getComebackStatus('u1', 'g1', 'md1');

    expect(prisma.prediction.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ doublePointsWildcard: true }),
      }),
    );
    const callArg = prisma.prediction.count.mock.calls[0][0];
    expect(callArg.where.doubleChanceOption).toBeUndefined();
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

describe('WildcardsService.getComebackStatus — comodin extra por video', () => {
  it('sin AdRewardClaim, adBonusClaimed es false y adBonusAvailable true si el grupo tiene el comodin activado y la jornada no ha terminado', async () => {
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );

    const status = await service.getComebackStatus('u1', 'g1', 'md1');

    expect(status.adBonusClaimed).toBe(false);
    expect(status.adBonusAvailable).toBe(true);
  });

  it('con AdRewardClaim ya existente, suma +1 al allowance y adBonusAvailable pasa a false', async () => {
    const { service, prisma } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );
    prisma.adRewardClaim.findUnique.mockResolvedValue({ id: 'claim1' });

    const status = await service.getComebackStatus('u1', 'g1', 'md1');

    expect(status).toMatchObject({ allowance: 1, adBonusClaimed: true, adBonusAvailable: false });
  });

  it('adBonusAvailable es false si la jornada ya ha terminado', async () => {
    const { service, prisma } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );
    prisma.matchday.findUnique.mockResolvedValue({ status: 'FINISHED', competitionId: 'c1' });

    const status = await service.getComebackStatus('u1', 'g1', 'md1');

    expect(status.adBonusAvailable).toBe(false);
  });

  it('adBonusAvailable es false si el grupo tiene el comodin desactivado', async () => {
    const { service } = buildDeps(
      { comebackEnabled: false, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );

    const status = await service.getComebackStatus('u1', 'g1', 'md1');

    expect(status.adBonusAvailable).toBe(false);
  });

  it('sin matchdayId, adBonusClaimed y adBonusAvailable son siempre false', async () => {
    const { service } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );

    const status = await service.getComebackStatus('u1', 'g1');

    expect(status).toMatchObject({ adBonusClaimed: false, adBonusAvailable: false });
  });
});

describe('WildcardsService.claimAdReward', () => {
  it('crea la fila de AdRewardClaim y devuelve el estado actualizado con el bonus aplicado', async () => {
    const { service, prisma } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );
    // Tras el create(), la siguiente lectura de getComebackStatus ya debe encontrar la fila.
    prisma.adRewardClaim.findUnique.mockResolvedValue({ id: 'claim1' });

    const status = await service.claimAdReward('u1', 'g1', 'md1');

    expect(prisma.adRewardClaim.create).toHaveBeenCalledWith({
      data: { userId: 'u1', groupId: 'g1', matchdayId: 'md1' },
    });
    expect(status.allowance).toBe(1);
  });

  it('rechaza si el grupo tiene el comodin de remontada desactivado', async () => {
    const { service } = buildDeps(
      { comebackEnabled: false, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );

    await expect(service.claimAdReward('u1', 'g1', 'md1')).rejects.toThrow();
  });

  it('rechaza si la jornada ya ha terminado', async () => {
    const { service, prisma } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );
    prisma.matchday.findUnique.mockResolvedValue({ status: 'FINISHED', competitionId: 'c1' });

    await expect(service.claimAdReward('u1', 'g1', 'md1')).rejects.toThrow();
  });

  it('es idempotente: si ya estaba reclamado (choque de unicidad), no lanza y devuelve el estado igualmente', async () => {
    const { service, prisma } = buildDeps(
      { comebackEnabled: true, comebackPointsPerBonus: 6 },
      [{ competitionId: 'c1' }],
      [],
    );
    const { Prisma } = jest.requireActual('@prisma/client');
    prisma.adRewardClaim.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '5.0.0',
      }),
    );
    prisma.adRewardClaim.findUnique.mockResolvedValue({ id: 'claim1' });

    const status = await service.claimAdReward('u1', 'g1', 'md1');

    expect(status.adBonusClaimed).toBe(true);
  });
});
