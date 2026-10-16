import { Prisma, QuizOption } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { FootballProvider } from '../football-data/football-provider.interface';
import { QuizService, seasonLabelFor } from './quiz.service';
import { getCurrentFootballSeason } from '../common/season.util';
import { openQuizWindow } from './quiz.rules';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LocalizedExceptionFilter } from '../common/i18n/localized-exception.filter';
import { QuizController } from './quiz.controller';

// Explicit opt-in, isolated local DB only. Regular unit runs skip database access.
const databaseUrl = process.env.TEST_QUIZ_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;
const prefix = 'quiz-it-';

integration('Quiz API service against MySQL', () => {
  let prisma: PrismaService;
  let service: QuizService;
  let app: INestApplication;
  let baseUrl: string;
  const jwt = new JwtService({ secret: 'isolated-quiz-test-secret' });
  const season = getCurrentFootballSeason();
  const future = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    const url = new URL(databaseUrl!);
    if (
      !['127.0.0.1', 'localhost'].includes(url.hostname) ||
      url.pathname !== '/acerton_quiz_test'
    ) {
      throw new Error(
        'Quiz integration tests require the isolated local acerton_quiz_test database',
      );
    }
    prisma = new PrismaService({ datasources: { db: { url: databaseUrl } } });
    await prisma.$connect();
    service = new QuizService(prisma, new MatchdaysService(prisma, {} as FootballProvider));
    const module = await Test.createTestingModule({
      controllers: [QuizController],
      providers: [
        { provide: QuizService, useValue: service },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: () => 'isolated-quiz-test-secret' } },
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_FILTER, useClass: LocalizedExceptionFilter },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  async function clean() {
    // Los quizzes mixtos no cuelgan de una jornada: no se borran en cascada con la liga.
    await prisma.quizEvent.deleteMany({ where: { windowKey: { not: null } } });
    await prisma.competition.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
  }

  beforeEach(async () => {
    await clean();
    await prisma.competition.createMany({
      data: [
        {
          id: `${prefix}liga`,
          code: 'LA_LIGA',
          name: 'La Liga',
          externalId: 2014,
          currentSeason: season,
        },
        {
          id: `${prefix}premier`,
          code: 'PREMIER_LEAGUE',
          name: 'Premier League',
          externalId: 2021,
          currentSeason: season,
        },
      ],
    });
    await prisma.user.createMany({
      data: ['a', 'b', 'c'].map((id) => ({
        id: `${prefix}${id}`,
        email: `${prefix}${id}@example.test`,
        name: id.toUpperCase(),
        referralCode: `${prefix}${id}`,
        emailVerifiedAt: new Date(),
      })),
    });
  });

  afterAll(async () => {
    if (prisma) {
      await clean();
      if (app) await app.close();
      await prisma.$disconnect();
    }
  });

  /** El proximo quiz de ligas cuyos partidos aun no han empezado (si ahora se juega el de Champions, el siguiente). */
  function leagueWindow() {
    const now = openQuizWindow(new Date());
    return now.kind === 'WEEKEND' ? now : openQuizWindow(now.start);
  }

  /** Hora de los partidos: dentro de la ventana y nunca a medianoche UTC (seria una hora sin confirmar). */
  function kickoffBase(): Date {
    return new Date(leagueWindow().start.getTime() + 2 * 60 * 60 * 1000 + 30000);
  }

  /** Cierra ya el quiz (su cierre es a hora fija, dias despues): como si hubiese llegado el corte. */
  async function closeNow(eventId: string) {
    await prisma.quizEvent.update({
      where: { id: eventId },
      data: { closesAt: new Date(Date.now() - 1000) },
    });
  }

  async function createRound(league = 'liga', order = 1, count = 10) {
    const id = `${prefix}${league}-${order}`;
    const base = kickoffBase().getTime();
    await prisma.matchday.create({
      data: {
        id,
        competitionId: `${prefix}${league}`,
        season,
        name: `Regular Season - ${order}`,
        order,
        closesAt: future(),
        status: 'OPEN',
        matches: {
          create: Array.from({ length: count }, (_, i) => ({
            id: `${id}-m${i}`,
            externalId: (league === 'liga' ? 800000 : 900000) + order * 100 + i,
            homeTeam: i === count - 1 ? 'FC Barcelona' : `Club ${i}`,
            awayTeam: 'Opponent',
            kickoff: new Date(base + i * 1000),
          })),
        },
      },
    });
  }

  async function publish() {
    const window = leagueWindow();
    await service.publishAvailable(window.opensAt);
    return prisma.quizEvent.findFirst({
      where: { windowKey: window.key },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
  }

  async function round(league = 'liga', order = 1, count = 10) {
    await createRound(league, order, count);
    return publish();
  }

  const quizMatchIds = (event: { questions: { matchId: string }[] }) => [
    ...new Set(event.questions.map((q) => q.matchId)),
  ];

  it('serves the HTTP contract with JWT auth, nested DTO validation and stable localized error codes', async () => {
    const event = (await round())!;
    expect((await fetch(`${baseUrl}/api/quiz/overview`)).status).toBe(401);
    const headers = {
      Authorization: `Bearer ${jwt.sign({ sub: `${prefix}a` })}`,
      'Content-Type': 'application/json',
    };
    const overview = await fetch(`${baseUrl}/api/quiz/overview`, { headers });
    expect(overview.status).toBe(200);
    const body = await overview.json();
    expect(body.events[0].id).toBe(event.id);
    expect(body.events[0].kind).toBe('MIXED');
    expect(body.quizzes).toEqual([]);
    const malformed = await fetch(`${baseUrl}/api/quiz/${event.id}/answers`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ answers: [{ questionId: event.questions[0].id, option: 'INVALID' }] }),
    });
    expect(malformed.status).toBe(400);
    expect(await prisma.quizParticipation.count()).toBe(0);
    const foreignUser = await fetch(`${baseUrl}/api/quiz/${event.id}/answers`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        userId: `${prefix}b`,
        answers: [{ questionId: event.questions[0].id, option: 'HOME' }],
      }),
    });
    expect(foreignUser.status).toBe(400);
    const saved = await fetch(`${baseUrl}/api/quiz/${event.id}/answers`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        answers: [
          {
            questionId: event.questions[0].id,
            option: (event.questions[0].options as string[])[0],
          },
        ],
      }),
    });
    expect(saved.status).toBe(200);
    expect((await saved.json()).quiz.participation.answeredCount).toBe(1);
    expect((await fetch(`${baseUrl}/api/quiz/rankings?limit=101`, { headers })).status).toBe(400);
    const missing = await fetch(`${baseUrl}/api/quiz/missing`, {
      headers: { ...headers, 'Accept-Language': 'en' },
    });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      code: 'QUIZ_NOT_FOUND',
      message: 'Quiz not found',
    });
  });

  it('mixes leagues in one quiz of 20 questions, published once per window and supporting users without groups', async () => {
    await createRound('liga', 1, 10);
    await createRound('premier', 1, 10);
    const event = (await publish())!;
    expect(event.questions).toHaveLength(20);
    expect(event.matchdayId).toBeNull();
    const detail = await service.detail(event.id, `${prefix}a`);
    expect(new Set(detail.questions.map((q) => q.competition.id))).toEqual(
      new Set([`${prefix}liga`, `${prefix}premier`]),
    );
    expect(detail.quiz.kind).toBe('MIXED');
    expect(detail.quiz.matchdayOrder).toBe(1);
    // Una ronda importada despues no cambia un quiz ya publicado.
    await createRound('liga', 2, 5);
    const again = (await publish())!;
    expect(again.id).toBe(event.id);
    expect(again.questions.map((q) => q.id)).toEqual(event.questions.map((q) => q.id));
    const first = await service.start(event.id, `${prefix}a`);
    const second = await service.start(event.id, `${prefix}b`);
    expect(first.questions.map((q) => [q.id, q.type, q.options])).toEqual(
      second.questions.map((q) => [q.id, q.type, q.options]),
    );
    expect(first.questions.every((q) => q.correctOption === null)).toBe(true);
    expect(await prisma.groupMembership.count()).toBe(0);
    await Promise.all([
      service.start(event.id, `${prefix}a`),
      service.start(event.id, `${prefix}a`),
    ]);
    expect(
      await prisma.quizParticipation.count({ where: { userId: `${prefix}a`, eventId: event.id } }),
    ).toBe(1);
  });

  it('saves partial answers, resumes, validates batches atomically and keeps other players private', async () => {
    const event = (await round())!;
    const question = event.questions.find((q) => q.type === 'WINNER')!;
    const option = (question.options as QuizOption[])[0];
    await service.saveAnswers(event.id, `${prefix}a`, [{ questionId: question.id, option }]);
    const detail = await service.detail(event.id, `${prefix}a`);
    expect(detail.quiz.participation?.answeredCount).toBe(1);
    expect(
      (await service.detail(event.id, `${prefix}b`)).questions.every(
        (q) => q.selectedOption === null,
      ),
    ).toBe(true);
    await expect(
      service.saveAnswers(event.id, `${prefix}a`, [
        { questionId: question.id, option },
        { questionId: 'foreign-question', option: 'YES' },
      ]),
    ).rejects.toMatchObject({ response: { code: 'INVALID_QUIZ_ANSWER' } });
    await expect(
      service.saveAnswers(event.id, `${prefix}a`, [{ questionId: question.id, option: 'YES' }]),
    ).rejects.toMatchObject({ response: { code: 'INVALID_QUIZ_ANSWER' } });
    await expect(
      service.saveAnswers(event.id, `${prefix}a`, [
        { questionId: question.id, option },
        { questionId: question.id, option },
      ]),
    ).rejects.toMatchObject({ response: { code: 'INVALID_QUIZ_ANSWER' } });
    expect(await prisma.quizAnswer.count()).toBe(1);
    await expect(service.complete(event.id, `${prefix}a`)).rejects.toMatchObject({
      response: { code: 'QUIZ_INCOMPLETE' },
    });
    await service.saveAnswers(
      event.id,
      `${prefix}a`,
      event.questions.map((q) => ({ questionId: q.id, option: (q.options as QuizOption[])[0] })),
    );
    expect(
      (await service.complete(event.id, `${prefix}a`)).quiz.participation?.completedAt,
    ).not.toBeNull();
    expect(
      (
        await service.saveAnswers(event.id, `${prefix}a`, [
          { questionId: question.id, option: 'AWAY' },
        ])
      ).canAnswer,
    ).toBe(true);
  });

  it('keeps its fixed close when a game moves earlier, voids that game and never reopens', async () => {
    const event = (await round('liga', 1, 12))!;
    const [first, second] = quizMatchIds(event);
    // Un partido se adelanta y se juega: el quiz sigue abierto hasta su hora fija.
    await prisma.match.update({
      where: { id: first },
      data: { kickoff: new Date(Date.now() - 60000), status: 'LIVE' },
    });
    const open = await service.detail(event.id, `${prefix}a`);
    expect(open.canAnswer).toBe(true);
    expect(open.quiz.closesAt).toBe(event.closesAt.toISOString());
    await service.start(event.id, `${prefix}a`);
    // Llega el cierre: el adelantado se anula, el resto se resuelve con normalidad.
    await prisma.match.update({
      where: { id: first },
      data: { status: 'FINISHED', homeScore: 1, awayScore: 0 },
    });
    await prisma.match.update({
      where: { id: second },
      data: { status: 'FINISHED', homeScore: 0, awayScore: 0 },
    });
    await closeNow(event.id);
    const closed = await service.detail(event.id, `${prefix}a`);
    expect(closed.canAnswer).toBe(false);
    for (const question of closed.questions) {
      if (question.match.id === first) expect(question.resolution).toBe('VOID');
      if (question.match.id === second) expect(question.resolution).toBe('RESOLVED');
    }
    await expect(service.start(event.id, `${prefix}b`)).rejects.toMatchObject({
      response: { code: 'QUIZ_CLOSED' },
    });
    // Aunque el cierre se moviese, un quiz cerrado no se reabre.
    await prisma.quizEvent.update({ where: { id: event.id }, data: { closesAt: future() } });
    expect((await service.detail(event.id, `${prefix}a`)).canAnswer).toBe(false);
  });

  it('checks the deadline again after waiting for a competing database lock', async () => {
    const event = (await round())!;
    await service.start(event.id, `${prefix}a`);
    let acquired!: () => void;
    const acquiredPromise = new Promise<void>((resolve) => {
      acquired = resolve;
    });
    const held = prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM quiz_events WHERE id = ${event.id} FOR UPDATE`);
      const soon = new Date(Date.now() + 100);
      await tx.quizEvent.update({ where: { id: event.id }, data: { closesAt: soon } });
      acquired();
      await new Promise((resolve) => setTimeout(resolve, 250));
    });
    await acquiredPromise;
    const saved = service.saveAnswers(event.id, `${prefix}a`, [
      { questionId: event.questions[0].id, option: 'HOME' },
    ]);
    await held;
    await expect(saved).rejects.toMatchObject({ response: { code: 'QUIZ_CLOSED' } });
    expect(await prisma.quizAnswer.count()).toBe(0);
  });

  it('scores idempotently, handles cancelled/postponed matches, and corrects a previous final result', async () => {
    const event = (await round('liga', 1, 2))!;
    await service.saveAnswers(
      event.id,
      `${prefix}a`,
      event.questions.map((q) => ({
        questionId: q.id,
        option: (q.options as QuizOption[])[0],
      })),
    );
    await prisma.match.updateMany({
      where: { id: { in: quizMatchIds(event) } },
      data: { status: 'FINISHED', homeScore: 3, awayScore: 0, htHomeScore: 1, htAwayScore: 0 },
    });
    await closeNow(event.id);
    const first = await service.detail(event.id, `${prefix}a`);
    const second = await service.detail(event.id, `${prefix}a`);
    expect(second.quiz.participation?.points).toBe(first.quiz.participation?.points);
    expect(first.quiz.status).toBe('FINISHED');
    const expected = first.questions.filter((q) => q.selectedOption === q.correctOption).length;
    expect(first.quiz.participation?.points).toBe(expected);
    await prisma.match.updateMany({
      where: { id: { in: quizMatchIds(event) } },
      data: { homeScore: 0, awayScore: 3, htHomeScore: 0, htAwayScore: 1 },
    });
    const corrected = await service.detail(event.id, `${prefix}a`);
    expect(corrected.quiz.participation?.points).toBe(
      corrected.questions.filter((q) => q.selectedOption === q.correctOption).length,
    );
    expect(corrected.quiz.participation?.points).not.toBe(expected);
    const [cancelled, postponed] = quizMatchIds(event);
    await prisma.match.update({ where: { id: cancelled }, data: { status: 'CANCELLED' } });
    await prisma.match.update({ where: { id: postponed }, data: { status: 'POSTPONED' } });
    const pending = await service.detail(event.id, `${prefix}a`);
    expect(pending.quiz.participation?.voidCount).toBeGreaterThan(0);
    expect(pending.quiz.participation?.points).toBe(0);
    expect(pending.quiz.status).toBe('CLOSED');
    expect(pending.questions.every((q) => q.correctOption === null)).toBe(true);
  });

  it('returns cumulative and league rankings, shared positions, pagination and own row', async () => {
    await createRound('liga', 1, 1);
    await createRound('premier', 1, 1);
    const event = (await publish())!;
    for (const user of ['a', 'b']) {
      await service.saveAnswers(
        event.id,
        `${prefix}${user}`,
        event.questions.map((q) => ({
          questionId: q.id,
          option: (q.options as QuizOption[])[0],
        })),
      );
    }
    await prisma.match.updateMany({
      where: { id: { in: quizMatchIds(event) } },
      data: { status: 'FINISHED', homeScore: 3, awayScore: 0, htHomeScore: 1, htAwayScore: 0 },
    });
    await closeNow(event.id);
    // Salen tambien las cuentas activas que no han jugado (c), detras de todos y sin compartir puesto con nadie que haya
    // jugado; no salen las cuentas sin verificar (d) ni las de Google sin nombre elegido (e). El total no se compara con
    // un numero fijo: otras suites pueden crear usuarios en la misma base a la vez.
    await prisma.user.createMany({
      data: [
        {
          id: `${prefix}d`,
          email: `${prefix}d@example.test`,
          name: 'D',
          referralCode: `${prefix}d`,
        },
        {
          id: `${prefix}e`,
          email: `${prefix}e@example.test`,
          name: 'Nombre De Google',
          referralCode: `${prefix}e`,
          emailVerifiedAt: new Date(),
          usernameConfirmed: false,
        },
      ],
    });
    const general = await service.rankings(`${prefix}b`, { limit: 1 });
    const league = await service.rankings(`${prefix}b`, { competitionId: `${prefix}liga` });
    const premier = await service.rankings(`${prefix}b`, { competitionId: `${prefix}premier` });
    expect(general.rows).toHaveLength(1);
    expect(general.total).toBeGreaterThanOrEqual(3);
    expect(general.nextCursor).toBe('1');
    expect(general.me?.userId).toBe(`${prefix}b`);
    expect(general.me?.position).toBe(1);
    expect(league.rows.slice(0, 2).map((r) => r.position)).toEqual([1, 1]);
    // Por liga solo cuentan las preguntas de esa liga: entre las dos suman lo de la general.
    expect(general.me?.points).toBe(league.me!.points + premier.me!.points);
    expect(league.me?.quizzesPlayed).toBe(1);
    // Ligas: todo lo de partidos de liga (aqui, todo); Champions: nadie suma, no hay partidos europeos.
    const leagues = await service.rankings(`${prefix}b`, { scope: 'LEAGUES' });
    const champions = await service.rankings(`${prefix}b`, { scope: 'CHAMPIONS' });
    expect(leagues.scope).toBe('LEAGUES');
    expect(leagues.me?.points).toBe(general.me?.points);
    expect(champions.me).toEqual(expect.objectContaining({ points: 0, quizzesPlayed: 0 }));
    expect(general.provisional).toBe(false);
    const next = await service.rankings(`${prefix}c`, { cursor: '1', limit: 1 });
    expect(next.rows[0].userId).toBe(`${prefix}b`);
    expect(next.me).toEqual(
      expect.objectContaining({ userId: `${prefix}c`, points: 0, quizzesPlayed: 0 }),
    );
    // Detras de todos los que han jugado (aqui a y b, con lo que hayan sumado, aunque sea 0).
    const all = await service.rankings(`${prefix}c`, { limit: 100 });
    const played = all.rows.filter((row) => row.quizzesPlayed > 0);
    expect(next.me!.position).toBe(played.length + 1);
    expect(all.rows.findIndex((row) => row.quizzesPlayed === 0)).toBe(played.length);
    const ids = all.rows.map((row) => row.userId);
    expect(ids).toEqual(expect.arrayContaining([`${prefix}a`, `${prefix}b`, `${prefix}c`]));
    expect(ids).not.toContain(`${prefix}d`);
    expect(ids).not.toContain(`${prefix}e`);
    expect((await service.rankings(`${prefix}d`, {})).me).toBeNull();
    expect((await service.rankings(`${prefix}c`, { cursor: '100' })).total).toBeGreaterThanOrEqual(
      3,
    );
    // En una temporada ya acabada no salen las cuentas creadas despues.
    const old = await service.rankings(`${prefix}a`, { seasonLabel: seasonLabelFor(season - 1) });
    expect(old.me).toBeNull();
    expect(old.rows.every((row) => row.points === 0)).toBe(true);
    await expect(service.rankings(`${prefix}a`, { seasonLabel: '2026/99' })).rejects.toMatchObject({
      response: { code: 'INVALID_QUIZ_ANSWER' },
    });
  });
});
