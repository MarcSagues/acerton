import { NotFoundException } from '@nestjs/common';
import { PlayersService } from './players.service';

const USER = {
  id: 'u2',
  name: 'Marta',
  avatarUrl: '/assets/avatars/mascot/guino.png',
  avatarBackground: '#d2be94',
  experience: 250,
  favoriteTeam: 'Borussia Dortmund',
};

const match = (id: string, home: number, away: number, kickoff: string) => ({
  id,
  homeTeam: 'FC Barcelona',
  awayTeam: 'Real Madrid CF',
  homeScore: home,
  awayScore: away,
  kickoff: new Date(kickoff),
});

/** Pronosticos de marcador con partido jugado, del mas reciente al mas antiguo: 3 exactos de 4 (uno repetido en otro grupo). */
function scorePredictions() {
  return [
    {
      predictedHomeScore: 2,
      predictedAwayScore: 1,
      match: match('m4', 2, 1, '2026-10-12T18:00:00Z'),
    },
    {
      predictedHomeScore: 0,
      predictedAwayScore: 0,
      match: match('m3', 1, 0, '2026-10-05T18:00:00Z'),
    },
    {
      predictedHomeScore: 3,
      predictedAwayScore: 3,
      match: match('m2', 3, 3, '2026-09-28T18:00:00Z'),
    },
    {
      predictedHomeScore: 3,
      predictedAwayScore: 3,
      match: match('m2', 3, 3, '2026-09-28T18:00:00Z'),
    },
  ];
}

function build(overrides: { user?: unknown; counts?: Record<string, number> } = {}) {
  const predictionCount = jest.fn(
    ({ where }: { where: { groupId?: string; pointsEarned: { not?: null; gt?: number } } }) => {
      const hit = where.pointsEarned.gt !== undefined;
      if (where.groupId === 'g1') return Promise.resolve(hit ? 3 : 5);
      return Promise.resolve(hit ? 6 : 10);
    },
  );
  const quizAnswerCount = jest.fn(
    ({ where }: { where: { pointsEarned: number | { gt: number } } }) =>
      Promise.resolve(typeof where.pointsEarned === 'number' ? 4 : 7),
  );
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue('user' in overrides ? overrides.user : USER) },
    prediction: {
      count: predictionCount,
      findMany: jest.fn().mockResolvedValue(scorePredictions()),
    },
    globalStreak: {
      findUnique: jest.fn().mockResolvedValue({ currentStreak: 2, longestStreak: 9 }),
    },
    groupMembership: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest
        .fn()
        .mockResolvedValue([{ groupId: 'g1', group: { id: 'g1', name: 'Los cracks' } }]),
    },
    streak: { findUnique: jest.fn().mockResolvedValue({ currentStreak: 1, longestStreak: 4 }) },
    userBadge: {
      findMany: jest.fn().mockResolvedValue([
        {
          earnedAt: new Date('2026-10-02T10:00:00Z'),
          badge: { code: 'A', name: 'Uno', description: 'd1' },
        },
        {
          earnedAt: new Date('2026-09-20T10:00:00Z'),
          badge: { code: 'A', name: 'Uno', description: 'd1' },
        },
        {
          earnedAt: new Date('2026-09-10T10:00:00Z'),
          badge: { code: 'B', name: 'Dos', description: 'd2' },
        },
      ]),
    },
    quizAnswer: { count: quizAnswerCount },
  };
  const quiz = {
    rankings: jest.fn().mockResolvedValue({
      seasonLabel: '2026/27',
      total: 12,
      me: { position: 3, points: 21, quizzesPlayed: 5 },
    }),
  };
  return { prisma, quiz, service: new PlayersService(prisma as never, quiz as never) };
}

describe('PlayersService.getProfile', () => {
  it('junta los datos publicos, los grupos, el Quiz y las insignias del jugador', async () => {
    const { service } = build();

    const profile = await service.getProfile('u1', 'u2');

    expect(profile).toEqual(
      expect.objectContaining({
        userId: 'u2',
        name: 'Marta',
        level: 2,
        isMe: false,
        favoriteTeam: { name: 'Borussia Dortmund', primary: '#1a1a1a', secondary: '#fdd835' },
        groupsCount: 3,
      }),
    );
    expect(profile.predictions).toEqual({ scored: 10, hits: 6, misses: 4, hitRate: 0.6 });
    expect(profile.streak).toEqual({ current: 2, longest: 9 });
    expect(profile.quiz).toEqual({
      seasonLabel: '2026/27',
      position: 3,
      total: 12,
      points: 21,
      quizzesPlayed: 5,
      hits: 7,
      misses: 4,
    });
  });

  it('cuenta los marcadores exactos clavados y enseña los ultimos, sin repetir un partido jugado en varios grupos', async () => {
    const { prisma, service } = build();

    const profile = await service.getProfile('u1', 'u2');

    expect(prisma.prediction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 'u2', predictedHomeScore: { not: null } }),
      }),
    );
    // 4 pronosticos de marcador con partido jugado; clava 3 (el del 0-0 contra 1-0 falla; el 3-3 esta en dos grupos).
    expect(profile.exactScores.played).toBe(4);
    expect(profile.exactScores.hits).toBe(3);
    expect(profile.exactScores.recent.map((m) => m.matchId)).toEqual(['m4', 'm2']);
    expect(profile.exactScores.recent[0]).toEqual({
      matchId: 'm4',
      homeTeam: 'FC Barcelona',
      awayTeam: 'Real Madrid CF',
      homeTeamShort: null,
      awayTeamShort: null,
      homeScore: 2,
      awayScore: 1,
      kickoff: '2026-10-12T18:00:00.000Z',
    });
  });

  it('sin pronosticos de marcador (grupos 1X2) los exactos salen a cero y sin lista', async () => {
    const { prisma, service } = build();
    prisma.prediction.findMany.mockResolvedValue([]);

    const profile = await service.getProfile('u1', 'u2');

    expect(profile.exactScores).toEqual({ hits: 0, played: 0, recent: [] });
  });

  it('solo enseña los grupos que se comparten, con aciertos, fallos y racha de cada uno', async () => {
    const { prisma, service } = build();

    const profile = await service.getProfile('u1', 'u2');

    expect(prisma.groupMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u2', group: { memberships: { some: { userId: 'u1' } } } },
      }),
    );
    expect(profile.sharedGroups).toEqual([
      {
        groupId: 'g1',
        name: 'Los cracks',
        scored: 5,
        hits: 3,
        misses: 2,
        streak: { current: 1, longest: 4 },
      },
    ]);
  });

  it('en el perfil propio salen todos sus grupos (sin filtrar por grupos en comun)', async () => {
    const { prisma, service } = build({ user: { ...USER, id: 'u1' } });

    const profile = await service.getProfile('u1', 'u1');

    expect(profile.isMe).toBe(true);
    expect(prisma.groupMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('una insignia ganada en varios grupos sale una sola vez', async () => {
    const { service } = build();

    const profile = await service.getProfile('u1', 'u2');

    expect(profile.badges.map((b) => b.code)).toEqual(['A', 'B']);
  });

  it('sin predicciones puntuadas el porcentaje de acierto es null y el Quiz sin jugar sale a cero', async () => {
    const { prisma, quiz, service } = build();
    prisma.prediction.count.mockResolvedValue(0);
    quiz.rankings.mockResolvedValue({ seasonLabel: '2026/27', total: 12, me: null });

    const profile = await service.getProfile('u1', 'u2');

    expect(profile.predictions).toEqual({ scored: 0, hits: 0, misses: 0, hitRate: null });
    expect(profile.quiz.position).toBeNull();
    expect(profile.quiz.points).toBe(0);
  });

  it('un jugador que no existe es un 404', async () => {
    const { service } = build({ user: null });

    await expect(service.getProfile('u1', 'u2')).rejects.toBeInstanceOf(NotFoundException);
  });
});
