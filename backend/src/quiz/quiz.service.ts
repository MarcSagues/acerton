import { HttpException, Injectable } from '@nestjs/common';
import { Match, Prisma, QuizOption, QuizStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { xpProgressForLevel } from '../xp/xp.util';
import { findFavoriteTeam } from '../users/team-catalog';
import { getCurrentFootballSeason, getFootballSeasonForDate } from '../common/season.util';
import { isKickoffTimeUnconfirmed } from '../matchdays/matchday.util';
import { QuizAnswerDto, QuizRankingQueryDto } from './dto/quiz.dto';
import {
  generateMixedQuizQuestions,
  mustLockQuiz,
  openQuizWindow,
  QUIZ_COMPETITIONS,
  QUIZ_QUESTION_COUNT,
  quizDeadline,
  resolveMixedQuestion,
  resolveQuizQuestion,
  windowCompetitions,
} from './quiz.rules';

/**
 * Las lecturas (abrir el Quiz, la clasificacion) no repiten trabajo que ya hace el cron de cada minuto (QuizJobs.refreshAll):
 * publicar rondas y refrescar el estado de cada quiz. Las ligas casi no cambian, y publicar o refrescar un quiz se repite como
 * mucho cada tanto. Las escrituras (responder, terminar) siguen usando `refreshEvent` exacto.
 */
const COMPETITIONS_TTL_MS = 60_000;
const PUBLISH_TTL_MS = 30_000;
const REFRESH_TTL_MS = 20_000;

/** Cuantos quizzes como maximo se devuelven en el historial (los mas recientes). */
const HISTORY_LIMIT = 50;

/** Cada pregunta trae la liga de su partido: en el quiz mixto cada una puede ser de una liga distinta. */
const QUESTION_INCLUDE = {
  match: { include: { matchday: { include: { competition: true } } } },
} satisfies Prisma.QuizQuestionInclude;

const EVENT_INCLUDE = {
  matchday: { include: { competition: true, matches: true } },
  questions: { orderBy: { order: 'asc' as const }, include: QUESTION_INCLUDE },
} satisfies Prisma.QuizEventInclude;

type LoadedEvent = Prisma.QuizEventGetPayload<{ include: typeof EVENT_INCLUDE }>;
type LoadedQuestion = LoadedEvent['questions'][number];

/**
 * Liga que se envia en `competition` para un quiz mixto: las apps anteriores agrupan los quizzes por liga y no saben de
 * quizzes mixtos. Las nuevas usan `kind` y `competitions`.
 */
const MIXED_COMPETITION = { id: 'MIXED', code: 'MIXED', name: 'Piqo', logoUrl: null };

function competitionView(competition: {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
}) {
  return {
    id: competition.id,
    code: competition.code,
    name: competition.name,
    logoUrl: competition.logoUrl,
  };
}

/** Partidos que deciden el cierre: toda la jornada en un quiz antiguo; en uno mixto, solo los de sus preguntas. */
function eventMatches(event: Pick<LoadedEvent, 'matchday' | 'questions'>): Match[] {
  if (event.matchday) return event.matchday.matches;
  const matches = new Map<string, Match>();
  for (const question of event.questions) matches.set(question.match.id, question.match);
  return [...matches.values()];
}

/**
 * Cierre de un quiz: el mixto cierra a hora fija (el corte en que empiezan sus partidos); el antiguo, al empezar el
 * primer partido de su jornada.
 */
function deadlineOf(event: Pick<LoadedEvent, 'matchday' | 'questions' | 'windowKey' | 'closesAt'>) {
  return event.windowKey
    ? { closesAt: event.closesAt, kickoffConfirmed: true }
    : quizDeadline(eventMatches(event), event.closesAt);
}

/** Si el quiz ya no admite respuestas: el mixto, pasado su cierre; el antiguo, tambien si empezo un partido. */
function isLocked(
  event: Pick<LoadedEvent, 'matchday' | 'questions' | 'windowKey' | 'closesAt' | 'lockedAt'>,
  now: Date,
): boolean {
  const { closesAt } = deadlineOf(event);
  return event.windowKey
    ? event.lockedAt !== null || closesAt.getTime() <= now.getTime()
    : mustLockQuiz(event.lockedAt, eventMatches(event), closesAt, now);
}

/** Ligas de las preguntas de un quiz, en el orden en que salen. */
function eventCompetitions(questions: LoadedQuestion[]) {
  const competitions = new Map<string, ReturnType<typeof competitionView>>();
  for (const question of questions) {
    const competition = question.match.matchday.competition;
    if (!competitions.has(competition.id))
      competitions.set(competition.id, competitionView(competition));
  }
  return [...competitions.values()];
}
type Participation = Prisma.QuizParticipationGetPayload<{ include: { answers: true } }>;
type Tx = Prisma.TransactionClient;

interface RankedUser {
  position: bigint;
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  points: Prisma.Decimal;
  quizzesPlayed: bigint;
  total: bigint;
  rowNumber: bigint;
}

export function seasonLabelFor(season: number): string {
  return `${season}/${String((season + 1) % 100).padStart(2, '0')}`;
}

function fail(code: string, status: number, message: string): never {
  throw new HttpException({ statusCode: status, message, code }, status);
}

@Injectable()
export class QuizService {
  private competitionsCache: {
    at: number;
    value: Awaited<ReturnType<QuizService['loadCompetitions']>>;
  } | null = null;
  private lastPublishAt = 0;
  private publishInFlight: Promise<void> | null = null;
  private readonly refreshedAt = new Map<string, number>();
  private readonly refreshInFlight = new Map<string, Promise<boolean>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchdays: MatchdaysService,
  ) {}

  private loadCompetitions() {
    return this.prisma.competition.findMany({
      where: { code: { in: QUIZ_COMPETITIONS }, externalId: { gt: 0 } },
      orderBy: { code: 'asc' },
    });
  }

  /** Ligas del Quiz: casi estaticas, se guardan en memoria un minuto en vez de pedirlas en cada lectura. */
  async competitions() {
    const now = Date.now();
    if (this.competitionsCache && now - this.competitionsCache.at < COMPETITIONS_TTL_MS) {
      return this.competitionsCache.value;
    }
    const value = await this.loadCompetitions();
    this.competitionsCache = { at: now, value };
    return value;
  }

  /**
   * `publishAvailable` para las lecturas: como mucho una vez cada PUBLISH_TTL_MS, y las llamadas a la vez comparten la misma
   * ejecucion (antes cada apertura del Quiz recorria todas las rondas de todas las ligas).
   */
  private publishAvailableIfStale(): Promise<void> {
    if (this.publishInFlight) return this.publishInFlight;
    if (Date.now() - this.lastPublishAt < PUBLISH_TTL_MS) return Promise.resolve();
    const run = this.publishAvailable()
      .then(() => {
        this.lastPublishAt = Date.now();
      })
      .finally(() => {
        this.publishInFlight = null;
      });
    this.publishInFlight = run;
    return run;
  }

  /**
   * `refreshEvent` para las lecturas: se salta el refresco si el quiz se refresco hace menos de REFRESH_TTL_MS (el cron de cada
   * minuto ya lo mantiene al dia) y las llamadas a la vez comparten la misma transaccion. Devuelve si hubo refresco.
   */
  refreshEventIfStale(id: string): Promise<boolean> {
    const inFlight = this.refreshInFlight.get(id);
    if (inFlight) return inFlight;
    if (Date.now() - (this.refreshedAt.get(id) ?? 0) < REFRESH_TTL_MS)
      return Promise.resolve(false);
    const run = this.refreshEvent(id)
      .then(() => {
        this.refreshedAt.set(id, Date.now());
        return true;
      })
      .finally(() => {
        this.refreshInFlight.delete(id);
      });
    this.refreshInFlight.set(id, run);
    return run;
  }

  /**
   * Publica el quiz mixto que toca jugar ahora (ver QuizWindow): el de ligas de martes a viernes y el de Champions de
   * viernes a martes, con fechas fijas; sus 20 preguntas son de los partidos ya importados en local que se juegan desde
   * su cierre hasta el corte siguiente (ver planMixedQuiz). Si no hay partidos (semana sin Champions, paron), no hay
   * quiz. Sin peticiones al proveedor (QuizJobs importa antes las jornadas que hagan falta). Desde 2026-10-15 ya no se
   * publican quizzes por liga y jornada.
   */
  async publishAvailable(now = new Date()): Promise<void> {
    const window = openQuizWindow(now);
    const codes = windowCompetitions(window.kind);
    const competitions = (await this.competitions()).filter((c) => codes.includes(c.code));
    if (!competitions.length) return;
    // Ya publicado, o hay otro mixto del mismo tipo que cubre esos partidos (los de antes de las fechas fijas).
    const existing = await this.prisma.quizEvent.findFirst({
      where: {
        OR: [
          { windowKey: window.key },
          {
            windowKind: window.kind,
            windowStart: { lt: window.end },
            windowEnd: { gt: window.start },
          },
        ],
      },
      select: { id: true },
    });
    if (existing) return;
    const matches = await this.prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        kickoff: { gte: window.start, lt: window.end },
        matchday: {
          OR: competitions.map((c) => ({ competitionId: c.id, season: c.currentSeason })),
        },
      },
      include: { matchday: { select: { competition: { select: { code: true } } } } },
    });
    const questions = generateMixedQuizQuestions(
      matches.map(({ matchday, ...match }) => ({
        ...match,
        competitionCode: matchday.competition.code,
      })),
    );
    if (!questions.length) return;
    const seasonLabel = seasonLabelFor(getFootballSeasonForDate(window.start));
    const previous = await this.prisma.quizEvent.count({
      where: { seasonLabel, windowKey: { not: null } },
    });
    try {
      await this.prisma.quizEvent.create({
        data: {
          windowKey: window.key,
          windowKind: window.kind,
          windowStart: window.start,
          windowEnd: window.end,
          number: previous + 1,
          seasonLabel,
          status: 'OPEN',
          openedAt: now,
          closesAt: window.start,
          questions: { create: questions },
        },
      });
    } catch (error) {
      // Concurrent publication creates the same event only once, including its questions.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
        throw error;
    }
  }

  private async lockEvent(tx: Tx, id: string): Promise<LoadedEvent> {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM quiz_events WHERE id = ${id} FOR UPDATE
    `);
    if (!rows.length) fail('QUIZ_NOT_FOUND', 404, 'Quiz no encontrado');
    const event = await tx.quizEvent.findUnique({ where: { id }, include: EVENT_INCLUDE });
    if (!event) fail('QUIZ_NOT_FOUND', 404, 'Quiz no encontrado');
    return event;
  }

  /** Persist irreversible closure and recompute only changed resolutions under the same event lock. */
  async refreshEvent(id: string): Promise<void> {
    await this.prisma.$transaction(
      async (tx) => {
        const event = await this.lockEvent(tx, id);
        const now = new Date();
        const { closesAt } = deadlineOf(event);
        const locked = isLocked(event, now);
        const eligible =
          !locked &&
          (!event.matchdayId || (await this.matchdays.canAcceptPredictions(event.matchdayId)));
        let status: QuizStatus = locked ? 'CLOSED' : eligible ? 'OPEN' : 'SCHEDULED';
        let changed = false;
        let pending = false;
        for (const question of event.questions) {
          const resolution = !locked
            ? { resolution: 'PENDING' as const, correctOption: null }
            : event.windowKey
              ? resolveMixedQuestion(question.type, question.match, event.closesAt)
              : resolveQuizQuestion(question.type, question.match);
          if (resolution.resolution === 'PENDING') pending = true;
          if (
            resolution.resolution !== question.resolution ||
            resolution.correctOption !== question.correctOption
          ) {
            changed = true;
            await tx.quizQuestion.update({ where: { id: question.id }, data: resolution });
            // Reset first so corrected results or regressions to PENDING cannot keep old points.
            await tx.quizAnswer.updateMany({
              where: { questionId: question.id },
              data: {
                pointsEarned: resolution.resolution === 'RESOLVED' ? 0 : null,
              },
            });
            if (resolution.correctOption) {
              await tx.quizAnswer.updateMany({
                where: { questionId: question.id, option: resolution.correctOption },
                data: { pointsEarned: 1 },
              });
            }
          }
        }
        if (locked && !pending) status = 'FINISHED';
        if (changed) {
          // Derived totals, never increments: safe on retries, result corrections and multiple processes.
          await tx.$executeRaw(Prisma.sql`
          UPDATE quiz_participations p
          LEFT JOIN (SELECT a.participationId, SUM(COALESCE(a.pointsEarned, 0)) points
                     FROM quiz_answers a JOIN quiz_questions q ON q.id = a.questionId
                     WHERE q.eventId = ${id} GROUP BY a.participationId) a ON a.participationId = p.id
          SET p.points = COALESCE(a.points, 0) WHERE p.eventId = ${id}
        `);
        }
        await tx.quizEvent.update({
          where: { id },
          data: {
            status,
            closesAt: event.lockedAt ? event.closesAt : closesAt,
            lockedAt: locked ? (event.lockedAt ?? now) : null,
            openedAt: eligible ? (event.openedAt ?? now) : event.openedAt,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );
  }

  async refreshAll(): Promise<void> {
    await this.publishAvailable();
    // Keep finished events eligible for local corrections too, not just CLOSED events.
    const events = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT e.id FROM quiz_events e
      WHERE e.status <> 'FINISHED' OR EXISTS (
        SELECT 1 FROM quiz_questions q JOIN matches m ON m.id = q.matchId
        WHERE q.eventId = e.id AND m.updatedAt > e.updatedAt
      )
    `);
    for (const event of events) await this.refreshEvent(event.id);
  }

  /** Lo comun de un quiz antiguo (una liga y jornada) y de uno mixto (todas las ligas, por ventana). */
  private identity(
    event: Pick<
      LoadedEvent,
      | 'matchday'
      | 'matchdayId'
      | 'windowKey'
      | 'windowKind'
      | 'windowStart'
      | 'windowEnd'
      | 'number'
    > & { questions: LoadedQuestion[] },
  ) {
    const mixed = !event.matchday;
    const kickoffs = event.questions.map((q) => q.match.kickoff.getTime());
    return {
      kind: mixed ? ('MIXED' as const) : ('MATCHDAY' as const),
      window:
        mixed && event.windowKind && event.windowStart && event.windowEnd
          ? {
              kind: event.windowKind,
              start: event.windowStart.toISOString(),
              end: event.windowEnd.toISOString(),
              // Dias de sus partidos (los que se ensenan), dentro de start-end.
              firstKickoff: new Date(Math.min(...kickoffs)).toISOString(),
              lastKickoff: new Date(Math.max(...kickoffs)).toISOString(),
            }
          : null,
      competition: event.matchday ? competitionView(event.matchday.competition) : MIXED_COMPETITION,
      competitions: eventCompetitions(event.questions),
      matchdayId: event.matchdayId ?? '',
      matchdayOrder: event.matchday?.order ?? event.number ?? 0,
      matchdayName: event.matchday?.name ?? event.windowKey ?? '',
    };
  }

  private summary(event: LoadedEvent, participation: Participation | null) {
    return {
      id: event.id,
      ...this.identity(event),
      seasonLabel: event.seasonLabel,
      status: event.status,
      closesAt: event.closesAt.toISOString(),
      kickoffConfirmed: deadlineOf(event).kickoffConfirmed,
      questionCount: event.questions.length,
      matchCount: new Set(event.questions.map((q) => q.matchId)).size,
      participation: participation
        ? {
            answeredCount: participation.answers.length,
            completedAt: participation.completedAt?.toISOString() ?? null,
            points: participation.points,
            resolvedCount: event.questions.filter((q) => q.resolution === 'RESOLVED').length,
            voidCount: event.questions.filter((q) => q.resolution === 'VOID').length,
          }
        : null,
    };
  }

  private async readDetail(id: string, userId: string) {
    const event = await this.prisma.quizEvent.findUnique({ where: { id }, include: EVENT_INCLUDE });
    if (!event) fail('QUIZ_NOT_FOUND', 404, 'Quiz no encontrado');
    const participation = await this.prisma.quizParticipation.findUnique({
      where: { userId_eventId: { userId, eventId: id } },
      include: { answers: true },
    });
    const now = new Date();
    const canAnswer = event.status === 'OPEN' && !isLocked(event, now);
    return {
      serverNow: now.toISOString(),
      quiz: this.summary(event, participation),
      canAnswer,
      questions: event.questions.map((question) =>
        this.questionView(
          event,
          question,
          participation?.answers.find((a) => a.questionId === question.id),
        ),
      ),
    };
  }

  /** Una pregunta como la ve un jugador: su respuesta y, solo con el quiz cerrado y la pregunta resuelta, la correcta y sus puntos. */
  private questionView(
    event: Pick<LoadedEvent, 'lockedAt'>,
    question: LoadedEvent['questions'][number],
    answer: { option: QuizOption; pointsEarned: number | null } | undefined,
  ) {
    const resolved = event.lockedAt !== null && question.resolution === 'RESOLVED';
    const match = question.match;
    return {
      id: question.id,
      order: question.order,
      type: question.type,
      options: question.options,
      selectedOption: answer?.option ?? null,
      resolution: question.resolution,
      correctOption: resolved ? question.correctOption : null,
      pointsEarned: resolved ? (answer?.pointsEarned ?? 0) : null,
      competition: competitionView(match.matchday.competition),
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeTeamShort: match.homeTeamShort,
        awayTeamShort: match.awayTeamShort,
        homeTeamLogo: match.homeTeamLogo,
        awayTeamLogo: match.awayTeamLogo,
        kickoff: match.kickoff.toISOString(),
        kickoffConfirmed: !isKickoffTimeUnconfirmed(match.kickoff),
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    };
  }

  async detail(id: string, userId: string) {
    await this.refreshEvent(id);
    return this.readDetail(id, userId);
  }

  /**
   * Perfil de un jugador en el Quiz: sus datos publicos (nombre, avatar, nivel, equipo favorito) y el historial de
   * quizzes que ya cerraron y en los que respondio algo, del mas reciente al mas antiguo, con sus respuestas y si
   * acerto. Lo puede ver cualquier jugador (se llega desde la clasificacion del Quiz, que es de toda la comunidad,
   * con o sin grupo). Nunca enseña un quiz abierto: se filtraria lo que ha respondido a quien aun puede jugarlo.
   */
  async history(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarBackground: true,
        experience: true,
        favoriteTeam: true,
      },
    });
    if (!user) fail('USER_NOT_FOUND', 404, 'Usuario no encontrado');

    const participations = await this.prisma.quizParticipation.findMany({
      where: { userId, answers: { some: {} }, event: { lockedAt: { not: null } } },
      orderBy: { event: { closesAt: 'desc' } },
      take: HISTORY_LIMIT,
      include: {
        answers: true,
        event: {
          include: {
            matchday: { include: { competition: true, matches: true } },
            questions: { orderBy: { order: 'asc' }, include: QUESTION_INCLUDE },
          },
        },
      },
    });

    return {
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      avatarBackground: user.avatarBackground,
      level: xpProgressForLevel(user.experience).level,
      favoriteTeam: findFavoriteTeam(user.favoriteTeam),
      quizzes: participations.map((participation) => {
        const { event } = participation;
        const answered = event.questions.filter((q) =>
          participation.answers.some((a) => a.questionId === q.id),
        );
        return {
          quizId: event.id,
          ...this.identity(event),
          seasonLabel: event.seasonLabel,
          closesAt: event.closesAt.toISOString(),
          status: event.status,
          completedAt: participation.completedAt?.toISOString() ?? null,
          points: participation.points,
          questionCount: event.questions.length,
          questions: answered.map((question) =>
            this.questionView(
              event,
              question,
              participation.answers.find((a) => a.questionId === question.id),
            ),
          ),
        };
      }),
    };
  }

  /**
   * Resumen del Quiz: los quizzes abiertos y el ultimo mixto ya cerrado. Se resuelve con pocas consultas en
   * lote (la lista ligera de quizzes de la temporada, los quizzes elegidos y mis participaciones) en vez de recorrer cada liga
   * y cada quiz con varias consultas y un refresco cada uno.
   */
  async overview(userId: string) {
    await this.publishAvailableIfStale();
    const competitions = await this.competitions();
    const serverNow = new Date();
    const competitionsView = competitions.map(competitionView);
    if (competitions.length === 0)
      return {
        serverNow: serverNow.toISOString(),
        competitions: competitionsView,
        events: [],
        quizzes: [],
      };

    const seasonLabels = [...new Set(competitions.map((c) => seasonLabelFor(c.currentSeason)))];
    // Solo los quizzes mixtos de la temporada: los antiguos por liga y jornada ya no se ofrecen (los que siguieran
    // abiertos se cierran solos y quedan en el historial).
    const scope: Prisma.QuizEventWhereInput = {
      windowKey: { not: null },
      seasonLabel: { in: seasonLabels },
    };
    const lightEvents = () =>
      this.prisma.quizEvent.findMany({
        where: scope,
        select: { id: true, status: true, closesAt: true },
      });
    let events = await lightEvents();
    // Los quizzes sin cerrar se refrescan (si toca) para que un cierre vencido no oculte el siguiente abierto.
    let refreshed = false;
    for (const event of events) {
      if (event.status === 'SCHEDULED' || event.status === 'OPEN') {
        refreshed = (await this.refreshEventIfStale(event.id)) || refreshed;
      }
    }
    if (refreshed) events = await lightEvents();

    // Los abiertos (del que cierra antes al que mas tarda) y el ultimo mixto ya cerrado.
    const now = Date.now();
    const open = events
      .filter((e) => e.status === 'OPEN' && e.closesAt.getTime() > now)
      .sort((a, b) => a.closesAt.getTime() - b.closesAt.getTime());
    const previous = events
      .filter(
        (e) => e.status === 'CLOSED' || e.status === 'FINISHED' || e.closesAt.getTime() <= now,
      )
      .sort((a, b) => b.closesAt.getTime() - a.closesAt.getTime())[0];
    const picked = [...new Set([...open.map((e) => e.id), previous?.id].filter((id) => !!id))];

    const [full, participations] = picked.length
      ? await Promise.all([
          this.prisma.quizEvent.findMany({ where: { id: { in: picked } }, include: EVENT_INCLUDE }),
          this.prisma.quizParticipation.findMany({
            where: { userId, eventId: { in: picked } },
            include: { answers: true },
          }),
        ])
      : [[], []];
    const eventById = new Map(full.map((event) => [event.id, event]));
    const participationByEvent = new Map(participations.map((p) => [p.eventId, p]));
    const summaries = picked.flatMap((id) => {
      const event = eventById.get(id);
      return event ? [this.summary(event, participationByEvent.get(id) ?? null)] : [];
    });
    return {
      serverNow: serverNow.toISOString(),
      competitions: competitionsView,
      events: summaries,
      // Apps anteriores al quiz mixto: muestran los quizzes en pestañas por liga, asi que el mixto sale en todas.
      quizzes: summaries.flatMap((summary) =>
        summary.kind === 'MIXED'
          ? competitionsView.map((competition) => ({ ...summary, competition }))
          : [summary],
      ),
    };
  }

  private async assertWritable(event: LoadedEvent) {
    const deadline = deadlineOf(event);
    if (isLocked(event, new Date())) {
      fail('QUIZ_CLOSED', 409, 'El quiz ya está cerrado');
    }
    if (
      event.status !== 'OPEN' ||
      (event.matchdayId && !(await this.matchdays.canAcceptPredictions(event.matchdayId)))
    ) {
      fail('QUIZ_NOT_OPEN', 409, 'El quiz todavía no está abierto');
    }
    return deadline.closesAt;
  }

  private async write(
    id: string,
    userId: string,
    action: (tx: Tx, event: LoadedEvent, participation: Participation) => Promise<void>,
  ) {
    // Persist closure outside the write transaction; throwing inside it would roll that closure back.
    await this.refreshEvent(id);
    await this.prisma.$transaction(
      async (tx) => {
        const event = await this.lockEvent(tx, id);
        const deadline = await this.assertWritable(event);
        const participation = await tx.quizParticipation.upsert({
          where: { userId_eventId: { userId, eventId: id } },
          update: {},
          create: { userId, eventId: id },
          include: { answers: true },
        });
        await action(tx, event, participation);
        // Re-check after writes and any wait for the lock; rollback a request crossing the deadline.
        if (Date.now() >= deadline.getTime()) fail('QUIZ_CLOSED', 409, 'El quiz ya está cerrado');
        if (event.matchdayId) {
          const latest = await tx.match.findMany({ where: { matchdayId: event.matchdayId } });
          if (mustLockQuiz(null, latest, quizDeadline(latest, deadline).closesAt, new Date())) {
            fail('QUIZ_CLOSED', 409, 'El quiz ya está cerrado');
          }
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15_000 },
    );
    return this.detail(id, userId);
  }

  start(id: string, userId: string) {
    return this.write(id, userId, async () => undefined);
  }

  saveAnswers(id: string, userId: string, answers: QuizAnswerDto[]) {
    return this.write(id, userId, async (tx, event, participation) => {
      if (
        new Set(answers.map((a) => a.questionId)).size !== answers.length ||
        !answers.length ||
        answers.length > QUIZ_QUESTION_COUNT
      ) {
        fail('INVALID_QUIZ_ANSWER', 400, 'Respuesta de quiz no válida');
      }
      // Validate the whole batch before any update. Foreign questions and invalid options are rejected.
      for (const answer of answers) {
        const question = event.questions.find((q) => q.id === answer.questionId);
        if (
          !question ||
          !Array.isArray(question.options) ||
          !question.options.includes(answer.option)
        ) {
          fail('INVALID_QUIZ_ANSWER', 400, 'Respuesta de quiz no válida');
        }
      }
      for (const answer of answers) {
        await tx.quizAnswer.upsert({
          where: {
            participationId_questionId: {
              participationId: participation.id,
              questionId: answer.questionId,
            },
          },
          create: {
            participationId: participation.id,
            questionId: answer.questionId,
            option: answer.option,
          },
          update: { option: answer.option, pointsEarned: null },
        });
      }
    });
  }

  complete(id: string, userId: string) {
    return this.write(id, userId, async (tx, event, participation) => {
      if (participation.answers.length !== event.questions.length) {
        fail('QUIZ_INCOMPLETE', 400, 'Contesta todas las preguntas del quiz');
      }
      await tx.quizParticipation.update({
        where: { id: participation.id },
        data: { completedAt: participation.completedAt ?? new Date() },
      });
    });
  }

  async rankings(userId: string, query: QuizRankingQueryDto) {
    const seasonLabel = query.seasonLabel ?? seasonLabelFor(getCurrentFootballSeason());
    const season = Number(seasonLabel.slice(0, 4));
    if (seasonLabel !== seasonLabelFor(season))
      fail('INVALID_QUIZ_ANSWER', 400, 'Temporada de quiz no válida');
    if (
      query.competitionId &&
      !(await this.competitions()).some((c) => c.id === query.competitionId)
    ) {
      fail('QUIZ_NOT_FOUND', 404, 'Competición no encontrada');
    }
    // Only local data is refreshed; rankings never fetch the provider or a user's group.
    const events = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT e.id FROM quiz_events e
      WHERE e.seasonLabel = ${seasonLabel} AND
        (e.status <> 'FINISHED' OR EXISTS (
          SELECT 1 FROM quiz_questions q JOIN matches changed ON changed.id = q.matchId
          WHERE q.eventId = e.id AND changed.updatedAt > e.updatedAt
        ))
    `);
    for (const event of events) await this.refreshEventIfStale(event.id);
    // General: los puntos de cada quiz. Por liga: solo los de las preguntas de partidos de esa liga (un quiz mixto
    // mezcla ligas), y cuenta como jugado cada quiz con alguna respuesta en ella.
    const totals = query.competitionId
      ? Prisma.sql`
        SELECT p.userId, SUM(COALESCE(a.pointsEarned, 0)) points, COUNT(DISTINCT p.id) quizzesPlayed
        FROM quiz_participations p JOIN quiz_events e ON e.id = p.eventId
        JOIN quiz_answers a ON a.participationId = p.id
        JOIN quiz_questions q ON q.id = a.questionId
        JOIN matches mt ON mt.id = q.matchId
        JOIN matchdays md ON md.id = mt.matchdayId
        WHERE e.seasonLabel = ${seasonLabel} AND md.competitionId = ${query.competitionId}
        GROUP BY p.userId`
      : Prisma.sql`
        SELECT p.userId, SUM(p.points) points, COUNT(*) quizzesPlayed
        FROM quiz_participations p JOIN quiz_events e ON e.id = p.eventId
        WHERE e.seasonLabel = ${seasonLabel} GROUP BY p.userId`;
    const ranked = Prisma.sql`
      WITH totals AS (${totals}), ranked AS (
        SELECT t.*, RANK() OVER (ORDER BY t.points DESC) position,
          ROW_NUMBER() OVER (ORDER BY t.points DESC, t.userId ASC) rowNumber,
          COUNT(*) OVER () total, u.name, u.avatarUrl, u.avatarBackground
        FROM totals t JOIN users u ON u.id = t.userId
      )
    `;
    const offset = Number(query.cursor ?? 0);
    const limit = query.limit ?? 20;
    const [rows, own, counts] = await this.prisma.$transaction(
      [
        this.prisma.$queryRaw<RankedUser[]>(
          Prisma.sql`${ranked} SELECT * FROM ranked WHERE rowNumber > ${offset} ORDER BY rowNumber LIMIT ${limit + 1}`,
        ),
        this.prisma.$queryRaw<RankedUser[]>(
          Prisma.sql`${ranked} SELECT * FROM ranked WHERE userId = ${userId}`,
        ),
        this.prisma.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`${ranked} SELECT COUNT(*) total FROM ranked`,
        ),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    const mapRow = (row: RankedUser) => ({
      position: Number(row.position),
      // Orden total de la fila (los empates comparten `position` pero no `rowNumber`): sirve de cursor, y asi el cliente
      // pide una ventana alrededor de su puesto sin recorrer la clasificacion entera.
      rowNumber: Number(row.rowNumber),
      userId: row.userId,
      name: row.name,
      avatarUrl: row.avatarUrl,
      avatarBackground: row.avatarBackground,
      points: Number(row.points),
      quizzesPlayed: Number(row.quizzesPlayed),
    });
    const provisional = await this.prisma.quizEvent.count({
      where: {
        seasonLabel,
        status: { not: 'FINISHED' },
        participations: { some: {} },
        ...(query.competitionId
          ? { questions: { some: { match: { matchday: { competitionId: query.competitionId } } } } }
          : {}),
      },
    });
    return {
      seasonLabel,
      competitionId: query.competitionId ?? null,
      provisional: provisional > 0,
      rows: rows.slice(0, limit).map(mapRow),
      me: own[0] ? mapRow(own[0]) : null,
      total: Number(counts[0].total),
      nextCursor: rows.length > limit ? String(offset + limit) : null,
    };
  }
}
