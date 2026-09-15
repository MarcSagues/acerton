import { NotFoundException } from '@nestjs/common';
import { MemberProfileService } from './member-profile.service';

function buildPrismaMock() {
  return {
    groupMembership: {
      findUnique: jest.fn(),
    },
    streak: {
      findUnique: jest.fn(),
    },
    prediction: {
      findMany: jest.fn(),
    },
    userBadge: {
      findMany: jest.fn(),
    },
    rankingSnapshot: {
      findMany: jest.fn(),
    },
  };
}

describe('MemberProfileService.getMemberProfile', () => {
  it('lanza NotFoundException si el usuario no es miembro del grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue(null);

    const service = new MemberProfileService(prisma as never);

    await expect(service.getMemberProfile('g1', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('devuelve racha, % de aciertos, insignias del grupo y las ultimas jornadas jugadas', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({
      userId: 'u1',
      role: 'MEMBER',
      joinedAt: new Date('2026-01-01'),
      user: { id: 'u1', name: 'Marta', avatarUrl: null, avatarBackground: '#FFAA00', experience: 250 },
      group: { id: 'g1', name: 'Los cracks', scoringMode: 'ONE_X_TWO', ownerId: 'u9' },
    });
    prisma.streak.findUnique.mockResolvedValue({ currentStreak: 4, longestStreak: 7 });
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 1 },
      { pointsEarned: 0 },
      { pointsEarned: 3 },
    ]);
    prisma.userBadge.findMany.mockResolvedValue([
      {
        id: 'ub1',
        earnedAt: new Date('2026-02-01'),
        badge: { id: 'b1', code: 'STREAK_5', name: 'En racha', description: 'Acertaste 5 seguidas' },
      },
    ]);
    prisma.rankingSnapshot.findMany.mockResolvedValue([
      {
        matchdayId: 'md-2',
        points: 6,
        position: 1,
        matchday: { order: 2, closesAt: new Date('2026-01-08'), status: 'FINISHED', competition: { name: 'LaLiga' } },
      },
      {
        matchdayId: 'md-1',
        points: 3,
        position: 2,
        matchday: { order: 1, closesAt: new Date('2026-01-01'), status: 'FINISHED', competition: { name: 'LaLiga' } },
      },
    ]);

    const service = new MemberProfileService(prisma as never);
    const result = await service.getMemberProfile('g1', 'u1');

    expect(result).toEqual({
      userId: 'u1',
      name: 'Marta',
      avatarUrl: null,
      avatarBackground: '#FFAA00',
      level: 2,
      role: 'MEMBER',
      joinedAt: new Date('2026-01-01'),
      isOwner: false,
      group: { id: 'g1', name: 'Los cracks', scoringMode: 'ONE_X_TWO' },
      streak: { currentStreak: 4, longestStreak: 7 },
      hitRate: 2 / 3,
      scoredPredictionsCount: 3,
      badges: [
        {
          id: 'ub1',
          earnedAt: new Date('2026-02-01'),
          badge: { id: 'b1', code: 'STREAK_5', name: 'En racha', description: 'Acertaste 5 seguidas' },
        },
      ],
      recentMatchdays: [
        {
          matchdayId: 'md-2',
          order: 2,
          closesAt: new Date('2026-01-08'),
          points: 6,
          position: 1,
          competitionName: 'LaLiga',
          status: 'FINISHED',
        },
        {
          matchdayId: 'md-1',
          order: 1,
          closesAt: new Date('2026-01-01'),
          points: 3,
          position: 2,
          competitionName: 'LaLiga',
          status: 'FINISHED',
        },
      ],
    });
  });

  it('hitRate es null y racha en 0 si el usuario todavia no tiene ninguna prediccion puntuada ni racha', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({
      userId: 'u2',
      role: 'MEMBER',
      joinedAt: new Date('2026-03-01'),
      user: { id: 'u2', name: 'Nuevo', avatarUrl: null, avatarBackground: null },
      group: { id: 'g1', name: 'Los cracks', scoringMode: 'ONE_X_TWO', ownerId: 'u2' },
    });
    prisma.streak.findUnique.mockResolvedValue(null);
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.userBadge.findMany.mockResolvedValue([]);
    prisma.rankingSnapshot.findMany.mockResolvedValue([]);

    const service = new MemberProfileService(prisma as never);
    const result = await service.getMemberProfile('g1', 'u2');

    expect(result.hitRate).toBeNull();
    expect(result.streak).toEqual({ currentStreak: 0, longestStreak: 0 });
    expect(result.recentMatchdays).toEqual([]);
  });
});
