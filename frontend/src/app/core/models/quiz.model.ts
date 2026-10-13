import { CompetitionCode } from './competition.model';

/**
 * Quiz de jornada: evento global, sin grupos. Tipos calcados del contrato API v1
 * (docs/quiniela/quiz-jornada-plan.md, seccion 6). Cualquier cambio se acuerda
 * antes en ese documento: el servidor decide apertura, cierre y puntuacion.
 */
export type QuizStatus = 'SCHEDULED' | 'OPEN' | 'CLOSED' | 'FINISHED';

export type QuizQuestionType =
  | 'WINNER'
  | 'BOTH_SCORE'
  | 'OVER_2_5'
  | 'HOME_CLEAN_SHEET'
  | 'AWAY_CLEAN_SHEET'
  | 'HOME_TWO_PLUS'
  | 'AWAY_TWO_PLUS'
  | 'WIN_BY_TWO_PLUS';

export type QuizOptionCode = 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO';

export type QuizResolution = 'PENDING' | 'RESOLVED' | 'VOID';

export interface QuizCompetition {
  id: string;
  code: CompetitionCode;
  name: string;
  logoUrl: string | null;
}

export interface QuizParticipation {
  answeredCount: number;
  completedAt: string | null;
  points: number;
  resolvedCount: number;
  voidCount: number;
}

export interface QuizSummary {
  id: string;
  competition: QuizCompetition;
  matchdayId: string;
  matchdayOrder: number;
  matchdayName: string;
  /** "2026/27". */
  seasonLabel: string;
  status: QuizStatus;
  closesAt: string;
  kickoffConfirmed: boolean;
  questionCount: number;
  matchCount: number;
  participation: QuizParticipation | null;
}

export interface QuizMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamShort: string | null;
  awayTeamShort: string | null;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  kickoff: string;
  kickoffConfirmed: boolean;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface QuizQuestion {
  id: string;
  order: number;
  type: QuizQuestionType;
  match: QuizMatch;
  options: QuizOptionCode[];
  selectedOption: QuizOptionCode | null;
  resolution: QuizResolution;
  correctOption: QuizOptionCode | null;
  pointsEarned: number | null;
}

export interface QuizDetail {
  serverNow: string;
  quiz: QuizSummary;
  canAnswer: boolean;
  questions: QuizQuestion[];
}

export interface QuizOverview {
  serverNow: string;
  competitions: QuizCompetition[];
  quizzes: QuizSummary[];
}

export interface QuizRankingRow {
  position: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  points: number;
  quizzesPlayed: number;
}

export interface QuizRanking {
  seasonLabel: string;
  /** null = clasificacion general (todas las ligas). */
  competitionId: string | null;
  provisional: boolean;
  rows: QuizRankingRow[];
  me: QuizRankingRow | null;
  total: number;
  nextCursor: string | null;
}

export interface QuizRankingQuery {
  competitionId?: string | null;
  seasonLabel?: string | null;
  cursor?: string | null;
  limit?: number;
}

export interface QuizAnswerInput {
  questionId: string;
  option: QuizOptionCode;
}

/** `code` estable que el servidor añade al cuerpo de error (el mensaje se traduce en el cliente). */
export type QuizErrorCode = 'QUIZ_NOT_FOUND' | 'QUIZ_NOT_OPEN' | 'QUIZ_CLOSED' | 'QUIZ_INCOMPLETE' | 'INVALID_QUIZ_ANSWER';
