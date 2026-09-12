import { BadgesService } from './badges.service';

function buildPrismaMock() {
  return {
    groupMembership: { findMany: jest.fn() },
    streak: { findMany: jest.fn() },
    prediction: { findMany: jest.fn() },
  };
}

describe('BadgesService.getProgressForUser', () => {
  it('usa la mejor racha entre todos los grupos del usuario, sin superar el objetivo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }, { groupId: 'g2' }]);
    prisma.streak.findMany.mockResolvedValue([{ currentStreak: 3 }, { currentStreak: 7 }]);
    prisma.prediction.findMany.mockResolvedValue([]);

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['STREAK_5']).toEqual({ current: 5, target: 5 });
    expect(progress['STREAK_10']).toEqual({ current: 7, target: 10 });
  });

  it('cuenta los aciertos consecutivos mas recientes de cada grupo y se queda con el mejor', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }, { groupId: 'g2' }]);
    prisma.streak.findMany.mockResolvedValue([]);
    prisma.prediction.findMany.mockImplementation(({ where }: { where: { groupId: string } }) => {
      if (where.groupId === 'g1') {
        // Mas reciente primero: 2 aciertos seguidos y luego un fallo -> racha de 2.
        return Promise.resolve([{ pointsEarned: 1 }, { pointsEarned: 2 }, { pointsEarned: 0 }]);
      }
      // g2: 4 aciertos seguidos, ninguno mas antiguo puntuado todavia -> racha de 4.
      return Promise.resolve([{ pointsEarned: 1 }, { pointsEarned: 1 }, { pointsEarned: 5 }, { pointsEarned: 2 }]);
    });

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['HOT_STREAK_5']).toEqual({ current: 4, target: 5 });
  });

  it('una racha caliente rota por un fallo en el partido mas reciente da progreso 0, aunque haya aciertos antes', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1' }]);
    prisma.streak.findMany.mockResolvedValue([]);
    prisma.prediction.findMany.mockResolvedValue([{ pointsEarned: 0 }, { pointsEarned: 1 }, { pointsEarned: 1 }]);

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['HOT_STREAK_5']).toEqual({ current: 0, target: 5 });
  });

  it('sin grupos, todo el progreso queda a 0', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([]);

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['STREAK_5']).toEqual({ current: 0, target: 5 });
    expect(progress['STREAK_10']).toEqual({ current: 0, target: 10 });
    expect(progress['HOT_STREAK_5']).toEqual({ current: 0, target: 5 });
  });
});
