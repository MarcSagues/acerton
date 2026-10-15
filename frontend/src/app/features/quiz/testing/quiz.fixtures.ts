import {
  QuizCompetition,
  QuizDetail,
  QuizMatch,
  QuizOverview,
  QuizQuestion,
  QuizRanking,
  QuizRankingRow,
  QuizSummary,
} from '../../../core/models/quiz.model';

/**
 * Datos de ejemplo del contrato v1, SOLO para los tests (*.spec.ts). Nada de la
 * app los importa: la app habla siempre con la API real y, si falla, lo dice.
 */

export const LALIGA: QuizCompetition = { id: 'c-laliga', code: 'LA_LIGA', name: 'LaLiga', logoUrl: null };
export const PREMIER: QuizCompetition = { id: 'c-premier', code: 'PREMIER_LEAGUE', name: 'Premier League', logoUrl: null };

export function quizSummary(overrides: Partial<QuizSummary> = {}): QuizSummary {
  return {
    id: 'q1',
    kind: 'MATCHDAY',
    window: null,
    competition: LALIGA,
    competitions: [LALIGA],
    matchdayId: 'md9',
    matchdayOrder: 9,
    matchdayName: 'Jornada 9',
    seasonLabel: '2026/27',
    status: 'OPEN',
    closesAt: '2026-10-17T14:00:00.000Z',
    kickoffConfirmed: true,
    questionCount: 3,
    matchCount: 3,
    participation: null,
    ...overrides,
  };
}

export function quizMatch(overrides: Partial<QuizMatch> = {}): QuizMatch {
  return {
    id: 'm1',
    homeTeam: 'FC Barcelona',
    awayTeam: 'Real Madrid CF',
    homeTeamShort: 'Barça',
    awayTeamShort: 'Real Madrid',
    homeTeamLogo: null,
    awayTeamLogo: null,
    kickoff: '2026-10-17T19:00:00.000Z',
    kickoffConfirmed: true,
    status: 'SCHEDULED',
    homeScore: null,
    awayScore: null,
    ...overrides,
  };
}

export function quizQuestion(overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: 'qq1',
    order: 1,
    type: 'WINNER',
    match: quizMatch(),
    competition: LALIGA,
    options: ['HOME', 'DRAW', 'AWAY'],
    selectedOption: null,
    resolution: 'PENDING',
    correctOption: null,
    pointsEarned: null,
    ...overrides,
  };
}

/** Quiz abierto de 3 preguntas, con participacion iniciada y la primera ya contestada. */
export function quizDetail(overrides: Partial<QuizDetail> = {}, summary: Partial<QuizSummary> = {}): QuizDetail {
  const questions = overrides.questions ?? [
    quizQuestion({ id: 'qq1', order: 1, selectedOption: 'HOME' }),
    quizQuestion({ id: 'qq2', order: 2, type: 'BOTH_SCORE', options: ['YES', 'NO'], match: quizMatch({ id: 'm2' }) }),
    quizQuestion({ id: 'qq3', order: 3, type: 'HOME_CLEAN_SHEET', options: ['YES', 'NO'], match: quizMatch({ id: 'm3' }) }),
  ];
  return {
    serverNow: '2026-10-12T10:00:00.000Z',
    canAnswer: true,
    questions,
    quiz: quizSummary({
      questionCount: questions.length,
      participation: {
        answeredCount: questions.filter((q) => q.selectedOption !== null).length,
        completedAt: null,
        points: 0,
        resolvedCount: 0,
        voidCount: 0,
      },
      ...summary,
    }),
    ...overrides,
  };
}

/** Mismo detalle con una respuesta aplicada, como lo devolveria PUT /answers. */
export function withAnswer(detail: QuizDetail, questionId: string, option: QuizQuestion['selectedOption']): QuizDetail {
  const questions = detail.questions.map((q) => (q.id === questionId ? { ...q, selectedOption: option } : q));
  return {
    ...detail,
    questions,
    quiz: {
      ...detail.quiz,
      participation: detail.quiz.participation && {
        ...detail.quiz.participation,
        answeredCount: questions.filter((q) => q.selectedOption !== null).length,
      },
    },
  };
}

/** Quiz mixto del fin de semana (todas las ligas). */
export function mixedSummary(overrides: Partial<QuizSummary> = {}): QuizSummary {
  return quizSummary({
    id: 'mx1',
    kind: 'MIXED',
    window: { kind: 'WEEKEND', start: '2026-10-16T16:00:00.000Z', end: '2026-10-20T16:00:00.000Z', firstKickoff: '2026-10-16T18:30:00.000Z', lastKickoff: '2026-10-19T19:00:00.000Z' },
    competition: { id: 'MIXED', code: 'MIXED', name: 'Piqo', logoUrl: null },
    competitions: [LALIGA, PREMIER],
    matchdayId: '',
    matchdayOrder: 3,
    matchdayName: '2026-10-16-WEEKEND',
    questionCount: 20,
    matchCount: 9,
    ...overrides,
  });
}

/** `events` sale de `quizzes` si no se da: los tests de antes solo daban `quizzes`. */
export function overview(overrides: Partial<QuizOverview> = {}): QuizOverview {
  const quizzes = overrides.quizzes ?? [quizSummary(), quizSummary({ id: 'q2', competition: PREMIER, status: 'SCHEDULED' })];
  return {
    serverNow: '2026-10-12T10:00:00.000Z',
    competitions: [LALIGA, PREMIER],
    ...overrides,
    quizzes,
    events: overrides.events ?? quizzes,
  };
}

export function rankingRow(overrides: Partial<QuizRankingRow> = {}): QuizRankingRow {
  return {
    position: 1,
    rowNumber: 1,
    userId: 'u2',
    name: 'Ana',
    avatarUrl: null,
    avatarBackground: null,
    points: 12,
    quizzesPlayed: 2,
    ...overrides,
  };
}

export function ranking(overrides: Partial<QuizRanking> = {}): QuizRanking {
  return {
    seasonLabel: '2026/27',
    competitionId: null,
    provisional: false,
    rows: [rankingRow()],
    me: null,
    total: 1,
    nextCursor: null,
    ...overrides,
  };
}
