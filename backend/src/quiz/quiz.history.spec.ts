import { QuizService } from './quiz.service';

const match = {
  id: 'm1',
  homeTeam: 'FC Barcelona',
  awayTeam: 'Real Madrid CF',
  homeTeamShort: 'Barça',
  awayTeamShort: null,
  homeTeamLogo: null,
  awayTeamLogo: null,
  kickoff: new Date('2026-10-10T18:00:00Z'),
  status: 'FINISHED',
  homeScore: 2,
  awayScore: 1,
};

function question(id: string, order: number, resolution: string, correctOption: string | null) {
  return {
    id,
    order,
    type: 'WINNER',
    options: ['HOME', 'DRAW', 'AWAY'],
    resolution,
    correctOption,
    match,
  };
}

function participation() {
  return {
    completedAt: new Date('2026-10-10T10:00:00Z'),
    points: 1,
    answers: [
      { questionId: 'q1', option: 'HOME', pointsEarned: 1 },
      { questionId: 'q2', option: 'YES', pointsEarned: 0 },
    ],
    event: {
      id: 'e1',
      seasonLabel: '2026/27',
      status: 'FINISHED',
      closesAt: new Date('2026-10-10T17:00:00Z'),
      lockedAt: new Date('2026-10-10T17:00:00Z'),
      matchday: { order: 7, name: 'Jornada 7', competition: { id: 'c1', name: 'La Liga' } },
      questions: [
        question('q1', 1, 'RESOLVED', 'HOME'),
        question('q2', 2, 'RESOLVED', 'NO'),
        question('q3', 3, 'RESOLVED', 'HOME'), // sin responder: no sale
      ],
    },
  };
}

function build(overrides: { user?: unknown; participations?: unknown[] } = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(
        'user' in overrides
          ? overrides.user
          : {
              id: 'u2',
              name: 'Marta',
              avatarUrl: '/assets/avatars/mascot/guino.png',
              avatarBackground: '#d2be94',
              experience: 250,
              favoriteTeam: 'Borussia Dortmund',
            },
      ),
    },
    quizParticipation: {
      findMany: jest.fn().mockResolvedValue(overrides.participations ?? [participation()]),
    },
  };
  return { prisma, service: new QuizService(prisma as never, {} as never) };
}

describe('QuizService.history', () => {
  it('devuelve los quizzes cerrados con sus respuestas, y solo las preguntas que respondio', async () => {
    const { prisma, service } = build();

    const result = await service.history('u2');

    expect(result.name).toBe('Marta');
    expect(result.quizzes).toHaveLength(1);
    const quiz = result.quizzes[0];
    expect(quiz).toEqual(
      expect.objectContaining({
        quizId: 'e1',
        seasonLabel: '2026/27',
        matchdayOrder: 7,
        points: 1,
        questionCount: 3,
      }),
    );
    expect(quiz.competition).toEqual({ id: 'c1', name: 'La Liga' });
    expect(quiz.questions.map((q) => q.id)).toEqual(['q1', 'q2']);
    // Acierto y fallo: la respuesta, la correcta y los puntos.
    expect(quiz.questions[0]).toEqual(
      expect.objectContaining({ selectedOption: 'HOME', correctOption: 'HOME', pointsEarned: 1 }),
    );
    expect(quiz.questions[1]).toEqual(
      expect.objectContaining({ selectedOption: 'YES', correctOption: 'NO', pointsEarned: 0 }),
    );
    // Solo quizzes cerrados y con alguna respuesta (si no, se filtraria un quiz que aun se puede jugar).
    expect(prisma.quizParticipation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u2', answers: { some: {} }, event: { lockedAt: { not: null } } },
      }),
    );
  });

  it('trae los datos publicos del jugador: avatar, nivel y equipo favorito con los colores de su bandera', async () => {
    const { service } = build();

    const result = await service.history('u2');

    expect(result).toEqual(
      expect.objectContaining({
        userId: 'u2',
        name: 'Marta',
        avatarUrl: '/assets/avatars/mascot/guino.png',
        avatarBackground: '#d2be94',
        level: 2,
        favoriteTeam: { name: 'Borussia Dortmund', primary: '#1a1a1a', secondary: '#fdd835' },
      }),
    );
  });

  it('lo puede ver cualquier jugador, sin comprobar grupos: la clasificacion del Quiz es de toda la comunidad', async () => {
    const { prisma, service } = build();

    await expect(service.history('u2')).resolves.toBeDefined();

    expect(prisma.quizParticipation.findMany).toHaveBeenCalledTimes(1);
  });

  it('un usuario que no existe es un 404', async () => {
    const { service } = build({ user: null });

    await expect(service.history('u2')).rejects.toMatchObject({ status: 404 });
  });

  it('un jugador sin quizzes jugados devuelve la lista vacia', async () => {
    const { service } = build({ participations: [] });

    expect((await service.history('u2')).quizzes).toEqual([]);
  });
});
