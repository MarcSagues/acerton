import { ConfigService } from '@nestjs/config';
import { QuizJobs } from './quiz.jobs';
import { QuizService } from './quiz.service';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { FootballProvider } from '../football-data/football-provider.interface';
import { AppConfig } from '../config/configuration';

function jobs(key = 'test-key') {
  const quiz = {
    competitions: jest.fn().mockResolvedValue([
      { id: 'liga', code: 'LA_LIGA' },
      { id: 'premier', code: 'PREMIER_LEAGUE' },
    ]),
    refreshAll: jest.fn().mockResolvedValue(undefined),
  };
  const prisma = { match: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() } };
  const matchdays = {
    ensureUpcomingMatchday: jest.fn().mockResolvedValue(true),
    ensureRoundsUntil: jest.fn().mockResolvedValue(false),
  };
  const football = { getFixturesByIds: jest.fn().mockResolvedValue([]) };
  const instance = new QuizJobs(
    quiz as unknown as QuizService,
    prisma as unknown as PrismaService,
    matchdays as unknown as MatchdaysService,
    { get: () => key } as unknown as ConfigService<AppConfig, true>,
    football as unknown as FootballProvider,
  );
  return { instance, quiz, prisma, matchdays, football };
}

describe('global quiz calendar jobs', () => {
  it('maintains the event competitions without querying group memberships', async () => {
    const { instance, matchdays, quiz } = jobs();
    await instance.syncCalendars();
    expect(matchdays.ensureUpcomingMatchday.mock.calls).toEqual([['liga'], ['premier']]);
    expect(quiz.refreshAll).toHaveBeenCalledTimes(1);
  });

  it('isolates provider failures by league and backs off empty calendars for three hours', async () => {
    jest.useFakeTimers();
    const { instance, matchdays } = jobs();
    const log = jest
      .spyOn(
        (instance as unknown as { logger: { error: (error: string, data: unknown) => void } })
          .logger,
        'error',
      )
      .mockImplementation(() => undefined);
    matchdays.ensureUpcomingMatchday
      .mockRejectedValueOnce(new Error('provider'))
      .mockResolvedValueOnce(false);
    await instance.syncCalendars();
    await instance.syncCalendars();
    expect(matchdays.ensureUpcomingMatchday).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(3 * 60 * 60 * 1000);
    await instance.syncCalendars();
    expect(matchdays.ensureUpcomingMatchday).toHaveBeenCalledTimes(4);
    log.mockRestore();
    jest.useRealTimers();
  });

  it('does not call the provider when the key is missing but still updates local events', async () => {
    const { instance, matchdays, quiz, football } = jobs('');
    await instance.syncCalendars();
    await instance.refreshRecentFinals();
    await instance.refreshEvents();
    expect(matchdays.ensureUpcomingMatchday).not.toHaveBeenCalled();
    expect(football.getFixturesByIds).not.toHaveBeenCalled();
    expect(quiz.refreshAll).toHaveBeenCalled();
  });

  it('prevents overlapping calendar imports', async () => {
    const { instance, matchdays } = jobs();
    let release!: (value: boolean) => void;
    matchdays.ensureUpcomingMatchday.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );
    const first = instance.syncCalendars();
    await Promise.resolve();
    await instance.syncCalendars();
    release(true);
    await first;
    expect(matchdays.ensureUpcomingMatchday).toHaveBeenCalledTimes(2);
  });

  it('imports ahead the rounds the next mixed quiz needs, and waits three hours when there is nothing new', async () => {
    jest.useFakeTimers();
    const { instance, matchdays } = jobs();
    await instance.syncCalendars();
    expect(matchdays.ensureRoundsUntil.mock.calls.map((call) => call[0])).toEqual([
      'liga',
      'premier',
    ]);
    // Hasta el final de los partidos del quiz siguiente: siempre por delante de ahora.
    expect((matchdays.ensureRoundsUntil.mock.calls[0][1] as Date).getTime()).toBeGreaterThan(
      Date.now(),
    );
    await instance.syncCalendars();
    expect(matchdays.ensureRoundsUntil).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(3 * 60 * 60 * 1000);
    await instance.syncCalendars();
    expect(matchdays.ensureRoundsUntil).toHaveBeenCalledTimes(4);
    jest.useRealTimers();
  });

  it('re-fetches recent finals of mixed quizzes too, so a late half-time score still arrives', async () => {
    const { instance, prisma } = jobs();
    await instance.refreshRecentFinals();
    expect(prisma.match.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [{ quizQuestions: { some: {} } }, { matchday: { quizEvent: { isNot: null } } }],
        }),
      }),
    );
  });
});
