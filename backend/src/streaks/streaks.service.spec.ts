import { StreaksService } from './streaks.service';

function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    matchday: { findUnique: jest.fn() },
    groupMembership: { findMany: jest.fn() },
    prediction: { findMany: jest.fn() },
    streak: { findUnique: jest.fn(), upsert: jest.fn() },
    globalStreak: { findUnique: jest.fn(), upsert: jest.fn() },
    ...overrides,
  };
}

function matchdayWithGroups(groupIds: string[]) {
  return {
    id: 'md-1',
    competition: {
      groupCompetitions: groupIds.map((groupId) => ({ groupId, isActive: true })),
    },
  };
}

describe('StreaksService.updateAfterMatchdayClose (racha global)', () => {
  it('pide la union deduplicada de miembros y predicciones de todos los grupos que comparten la competicion', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue(matchdayWithGroups(['gA', 'gB']));
    // El mismo usuario u1 esta en gA y gB; distinct: ['userId'] lo deduplica en la consulta real,
    // aqui simulamos ese resultado ya deduplicado para comprobar que solo se procesa una vez.
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.streak.findUnique.mockResolvedValue(null);
    prisma.globalStreak.findUnique.mockResolvedValue(null);

    const service = new StreaksService(prisma as never);
    await service.updateAfterMatchdayClose('md-1');

    expect(prisma.globalStreak.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.groupMembership.findMany).toHaveBeenLastCalledWith({
      where: { groupId: { in: ['gA', 'gB'] } },
      select: { userId: true },
      distinct: ['userId'],
    });
    expect(prisma.prediction.findMany).toHaveBeenLastCalledWith({
      where: { groupId: { in: ['gA', 'gB'] }, match: { matchdayId: 'md-1' } },
      select: { userId: true },
      distinct: ['userId'],
    });
  });

  it('participar en CUALQUIERA de los grupos que comparten la jornada cuenta para la racha global', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue(matchdayWithGroups(['gA', 'gB']));
    prisma.groupMembership.findMany
      .mockResolvedValueOnce([{ userId: 'u1' }]) // updateGroupStreaks(gA)
      .mockResolvedValueOnce([{ userId: 'u1' }]) // updateGroupStreaks(gB)
      .mockResolvedValueOnce([{ userId: 'u1' }]); // updateGlobalStreaks
    prisma.prediction.findMany
      .mockResolvedValueOnce([]) // gA: no participo aqui
      .mockResolvedValueOnce([{ userId: 'u1' }]) // gB: si participo aqui
      .mockResolvedValueOnce([{ userId: 'u1' }]); // global: participo en gB, cuenta
    prisma.streak.findUnique.mockResolvedValue(null);
    prisma.globalStreak.findUnique.mockResolvedValue({
      userId: 'u1',
      currentStreak: 2,
      longestStreak: 3,
      lastMatchdayId: 'md-0',
    });

    const service = new StreaksService(prisma as never);
    await service.updateAfterMatchdayClose('md-1');

    expect(prisma.globalStreak.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { currentStreak: 3, longestStreak: 3, lastMatchdayId: 'md-1' },
      create: expect.anything(),
    });
  });

  it('dejar pasar la jornada rompe la racha global aunque antes llevara varias seguidas', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue(matchdayWithGroups(['gA']));
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.findMany.mockResolvedValue([]); // nadie participo
    prisma.streak.findUnique.mockResolvedValue(null);
    prisma.globalStreak.findUnique.mockResolvedValue({
      userId: 'u1',
      currentStreak: 5,
      longestStreak: 5,
      lastMatchdayId: 'md-0',
    });

    const service = new StreaksService(prisma as never);
    await service.updateAfterMatchdayClose('md-1');

    expect(prisma.globalStreak.upsert).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      update: { currentStreak: 0, longestStreak: 5, lastMatchdayId: 'md-1' },
      create: expect.anything(),
    });
  });

  it('es idempotente: si esta jornada ya se proceso para la racha global, no la vuelve a tocar', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue(matchdayWithGroups(['gA']));
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.streak.findUnique.mockResolvedValue(null);
    prisma.globalStreak.findUnique.mockResolvedValue({
      userId: 'u1',
      currentStreak: 3,
      longestStreak: 3,
      lastMatchdayId: 'md-1',
    });

    const service = new StreaksService(prisma as never);
    await service.updateAfterMatchdayClose('md-1');

    expect(prisma.globalStreak.upsert).not.toHaveBeenCalled();
  });
});
