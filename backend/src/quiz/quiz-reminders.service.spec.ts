import {
  QUIZ_OPEN_NOTICE_MAX_AGE_MS,
  QuizReminderEvent,
  QuizRemindersService,
  dueClosingTier,
  openingNotice,
  quizTitle,
} from './quiz-reminders.service';

const HOUR = 60 * 60 * 1000;
const now = new Date('2026-10-13T12:00:00.000Z');
const inHours = (h: number) => new Date(now.getTime() + h * HOUR);

function event(overrides: Partial<QuizReminderEvent> = {}): QuizReminderEvent {
  return {
    status: 'OPEN',
    closesAt: inHours(48),
    openedAt: inHours(-1),
    openNotifiedAt: null,
    reminder1hSentAt: null,
    reminder24hSentAt: null,
    ...overrides,
  };
}

describe('openingNotice', () => {
  it('avisa de un quiz recien abierto una sola vez', () => {
    expect(openingNotice(event(), now)).toBe('send');
    expect(openingNotice(event({ openNotifiedAt: now }), now)).toBeNull();
    expect(openingNotice(event({ status: 'SCHEDULED' }), now)).toBeNull();
  });

  it('no avisa (solo marca) si se abrio hace demasiado o ya ha cerrado', () => {
    const old = new Date(now.getTime() - QUIZ_OPEN_NOTICE_MAX_AGE_MS - 1);
    expect(openingNotice(event({ openedAt: old }), now)).toBe('skip');
    expect(openingNotice(event({ closesAt: inHours(-1) }), now)).toBe('skip');
  });
});

describe('dueClosingTier', () => {
  it('24 h antes del cierre toca la de 24 h; en la ultima hora, la de 1 h', () => {
    expect(dueClosingTier(event({ closesAt: inHours(30) }), now)).toBeNull();
    expect(dueClosingTier(event({ closesAt: inHours(23) }), now)?.preference).toBe(
      'quizReminder24h',
    );
    expect(dueClosingTier(event({ closesAt: inHours(0.5) }), now)?.preference).toBe(
      'quizReminder1h',
    );
  });

  it('nunca repite una franja ni cae a la de 24 h dentro de la ultima hora', () => {
    expect(
      dueClosingTier(event({ closesAt: inHours(23), reminder24hSentAt: now }), now),
    ).toBeNull();
    expect(
      dueClosingTier(event({ closesAt: inHours(0.5), reminder1hSentAt: now }), now),
    ).toBeNull();
  });

  it('sin quiz abierto o ya cerrado, nada', () => {
    expect(dueClosingTier(event({ status: 'CLOSED', closesAt: inHours(0.5) }), now)).toBeNull();
    expect(dueClosingTier(event({ closesAt: inHours(-0.1) }), now)).toBeNull();
  });
});

describe('QuizRemindersService.sendDueReminders', () => {
  function build(
    events: Array<QuizReminderEvent & { id: string }>,
    completedUserIds: string[] = [],
  ) {
    const prisma = {
      quizEvent: {
        findMany: jest
          .fn()
          .mockResolvedValue(
            events.map((e) => ({ ...e, matchday: { order: 9, competition: { name: 'LaLiga' } } })),
          ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      notificationPreference: {
        findMany: jest.fn().mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]),
      },
      quizParticipation: {
        findMany: jest.fn().mockResolvedValue(completedUserIds.map((userId) => ({ userId }))),
      },
    };
    const notifications = { notifyQuiz: jest.fn().mockResolvedValue(undefined) };
    const service = new QuizRemindersService(prisma as never, notifications as never);
    return { service, prisma, notifications };
  }

  it('avisa de la apertura a quien tiene activada la preferencia', async () => {
    const { service, prisma, notifications } = build([{ id: 'q1', ...event() }]);

    await service.sendDueReminders(now);

    expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith({
      where: { quizOpening: true },
      select: { userId: true },
    });
    expect(notifications.notifyQuiz).toHaveBeenCalledWith(
      ['u1', 'u2'],
      'QUIZ_OPENED',
      'Quiz de LaLiga · Jornada 9',
      expect.any(String),
      'q1',
    );
  });

  it('el de cierre no le llega a quien ya termino el quiz', async () => {
    const { service, notifications } = build(
      [{ id: 'q1', ...event({ openNotifiedAt: now, closesAt: inHours(0.5) }) }],
      ['u2'],
    );

    await service.sendDueReminders(now);

    expect(notifications.notifyQuiz).toHaveBeenCalledTimes(1);
    expect(notifications.notifyQuiz).toHaveBeenCalledWith(
      ['u1'],
      'QUIZ_CLOSING_SOON',
      expect.any(String),
      expect.stringContaining('1 hora'),
      'q1',
    );
  });

  it('con la de 1 h marca tambien la de 24 h, y no envia nada si otra pasada ya reclamo la franja', async () => {
    const { service, prisma, notifications } = build([
      { id: 'q1', ...event({ openNotifiedAt: now, closesAt: inHours(0.5) }) },
    ]);
    prisma.quizEvent.updateMany.mockResolvedValueOnce({ count: 0 });

    await service.sendDueReminders(now);

    expect(prisma.quizEvent.updateMany).toHaveBeenCalledWith({
      where: { id: 'q1', reminder1hSentAt: null },
      data: { reminder1hSentAt: now, reminder24hSentAt: now },
    });
    expect(notifications.notifyQuiz).not.toHaveBeenCalled();
  });
});

describe('quizTitle', () => {
  it('names a mixed quiz by its window and an old one by its league and matchday', () => {
    expect(quizTitle({ windowKind: 'WEEKEND', matchday: null })).toBe('Quiz del fin de semana');
    expect(quizTitle({ windowKind: 'MIDWEEK', matchday: null })).toBe('Quiz de entre semana');
    expect(
      quizTitle({ windowKind: null, matchday: { order: 8, competition: { name: 'La Liga' } } }),
    ).toBe('Quiz de La Liga · Jornada 8');
  });
});
