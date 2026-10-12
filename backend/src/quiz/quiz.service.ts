import { HttpException, Injectable } from '@nestjs/common';
import { Prisma, QuizStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { getCurrentFootballSeason } from '../common/season.util';
import { isKickoffTimeUnconfirmed } from '../matchdays/matchday.util';
import { QuizAnswerDto, QuizRankingQueryDto } from './dto/quiz.dto';
import {
  generateQuizQuestions,
  mustLockQuiz,
  QUIZ_COMPETITIONS,
  quizDeadline,
  resolveQuizQuestion,
} from './quiz.rules';

const EVENT_INCLUDE = {
  matchday: { include: { competition: true, matches: true } },
  questions: { orderBy: { order: 'asc' as const }, include: { match: true } },
} satisfies Prisma.QuizEventInclude;

type LoadedEvent = Prisma.QuizEventGetPayload<{ include: typeof EVENT_INCLUDE }>;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly matchdays: MatchdaysService,
  ) {}

  async competitions() {
    return this.prisma.competition.findMany({
      where: { code: { in: QUIZ_COMPETITIONS }, externalId: { gt: 0 } },
      orderBy: { code: 'asc' },
    });
  }

  /** Publishes only eligible, not-yet-started rounds already imported locally. No provider request. */
  async publishAvailable(): Promise<void> {
    const competitions = await this.competitions();
    for (const competition of competitions) {
      const rounds = await this.prisma.matchday.findMany({
        where: {
          competitionId: competition.id,
          season: competition.currentSeason,
          quizEvent: null,
          matches: { some: {} },
          status: { not: 'FINISHED' },
        },
        include: { matches: true },
        orderBy: { order: 'asc' },
      });
      for (const round of rounds) {
        const deadline = quizDeadline(round.matches, round.closesAt);
        if (
          mustLockQuiz(null, round.matches, deadline.closesAt, new Date()) ||
          !(await this.matchdays.canAcceptPredictions(round.id))
        )
          continue;
        const questions = generateQuizQuestions(round.matches);
        if (!questions.length) continue;
        try {
          await this.prisma.quizEvent.create({
            data: {
              matchdayId: round.id,
              seasonLabel: seasonLabelFor(round.season),
              status: 'OPEN',
              openedAt: new Date(),
              closesAt: deadline.closesAt,
              questions: { create: questions },
            },
          });
        } catch (error) {
          // Concurrent publication creates the same event only once, including its questions.
          if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'))
            throw error;
        }
      }
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
        const { closesAt } = quizDeadline(event.matchday.matches, event.closesAt);
        const locked = mustLockQuiz(event.lockedAt, event.matchday.matches, closesAt, now);
        const eligible = !locked && (await this.matchdays.canAcceptPredictions(event.matchdayId));
        let status: QuizStatus = locked ? 'CLOSED' : eligible ? 'OPEN' : 'SCHEDULED';
        let changed = false;
        let pending = false;
        for (const question of event.questions) {
          const resolution = locked
            ? resolveQuizQuestion(question.type, question.match)
            : { resolution: 'PENDING' as const, correctOption: null };
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

  private summary(event: LoadedEvent, participation: Participation | null) {
    const competition = event.matchday.competition;
    return {
      id: event.id,
      competition: {
        id: competition.id,
        code: competition.code,
        name: competition.name,
        logoUrl: competition.logoUrl,
      },
      matchdayId: event.matchdayId,
      matchdayOrder: event.matchday.order,
      matchdayName: event.matchday.name,
      seasonLabel: event.seasonLabel,
      status: event.status,
      closesAt: event.closesAt.toISOString(),
      kickoffConfirmed: quizDeadline(event.matchday.matches, event.closesAt).kickoffConfirmed,
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
    const canAnswer =
      event.status === 'OPEN' &&
      !mustLockQuiz(event.lockedAt, event.matchday.matches, event.closesAt, now);
    return {
      serverNow: now.toISOString(),
      quiz: this.summary(event, participation),
      canAnswer,
      questions: event.questions.map((question) => {
        const answer = participation?.answers.find((a) => a.questionId === question.id);
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
      }),
    };
  }

  async detail(id: string, userId: string) {
    await this.refreshEvent(id);
    return this.readDetail(id, userId);
  }

  async overview(userId: string) {
    await this.publishAvailable();
    const competitions = await this.competitions();
    const quizzes = [];
    for (const competition of competitions) {
      const where: Prisma.QuizEventWhereInput = {
        matchday: { competitionId: competition.id, season: competition.currentSeason },
      };
      // Refresh stale OPEN rows first, otherwise an expired round can hide the next open quiz.
      const pending = await this.prisma.quizEvent.findMany({
        where: { ...where, status: { in: ['SCHEDULED', 'OPEN'] } },
        select: { id: true },
      });
      for (const event of pending) await this.refreshEvent(event.id);
      const next = await this.prisma.quizEvent.findFirst({
        where: { ...where, status: 'OPEN', closesAt: { gt: new Date() } },
        orderBy: { closesAt: 'asc' },
      });
      const previous = await this.prisma.quizEvent.findFirst({
        where: {
          ...where,
          OR: [{ status: { in: ['CLOSED', 'FINISHED'] } }, { closesAt: { lte: new Date() } }],
        },
        orderBy: { closesAt: 'desc' },
      });
      for (const id of new Set([next?.id, previous?.id].filter((id): id is string => !!id))) {
        const detail = await this.detail(id, userId);
        quizzes.push(detail.quiz);
      }
    }
    return {
      serverNow: new Date().toISOString(),
      competitions: competitions.map(({ id, code, name, logoUrl }) => ({
        id,
        code,
        name,
        logoUrl,
      })),
      quizzes,
    };
  }

  private async assertWritable(event: LoadedEvent) {
    const deadline = quizDeadline(event.matchday.matches, event.closesAt);
    if (mustLockQuiz(event.lockedAt, event.matchday.matches, deadline.closesAt, new Date())) {
      fail('QUIZ_CLOSED', 409, 'El quiz ya está cerrado');
    }
    if (event.status !== 'OPEN' || !(await this.matchdays.canAcceptPredictions(event.matchdayId))) {
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
        const latest = await tx.match.findMany({ where: { matchdayId: event.matchdayId } });
        if (mustLockQuiz(null, latest, quizDeadline(latest, deadline).closesAt, new Date())) {
          fail('QUIZ_CLOSED', 409, 'El quiz ya está cerrado');
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
        answers.length > 10
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
    const competitionFilter = query.competitionId
      ? Prisma.sql`AND m.competitionId = ${query.competitionId}`
      : Prisma.empty;
    const events = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT e.id FROM quiz_events e JOIN matchdays m ON m.id = e.matchdayId
      WHERE e.seasonLabel = ${seasonLabel} ${competitionFilter} AND
        (e.status <> 'FINISHED' OR EXISTS (
          SELECT 1 FROM quiz_questions q JOIN matches changed ON changed.id = q.matchId
          WHERE q.eventId = e.id AND changed.updatedAt > e.updatedAt
        ))
    `);
    for (const event of events) await this.refreshEvent(event.id);
    const ranked = Prisma.sql`
      WITH totals AS (
        SELECT p.userId, SUM(p.points) points, COUNT(*) quizzesPlayed
        FROM quiz_participations p JOIN quiz_events e ON e.id = p.eventId
        JOIN matchdays m ON m.id = e.matchdayId
        WHERE e.seasonLabel = ${seasonLabel} ${competitionFilter} GROUP BY p.userId
      ), ranked AS (
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
        ...(query.competitionId ? { matchday: { competitionId: query.competitionId } } : {}),
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
