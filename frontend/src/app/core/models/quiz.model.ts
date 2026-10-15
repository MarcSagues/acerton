import { FavoriteTeam } from './favorite-team.model';
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
  | 'WIN_BY_TWO_PLUS'
  | 'HALF_TIME_RESULT'
  | 'FIRST_HALF_GOAL'
  | 'SECOND_HALF_MORE_GOALS'
  | 'GOAL_BOTH_HALVES'
  | 'COMEBACK'
  | 'DRAW'
  | 'TOTAL_GOALS'
  | 'ODD_GOALS';

/** GOALS_*: opciones de TOTAL_GOALS (0-1, 2-3, 4 o mas). */
export type QuizOptionCode = 'HOME' | 'DRAW' | 'AWAY' | 'YES' | 'NO' | 'GOALS_0_1' | 'GOALS_2_3' | 'GOALS_4_PLUS';

export type QuizResolution = 'PENDING' | 'RESOLVED' | 'VOID';

export interface QuizCompetition {
  id: string;
  /** 'MIXED' en el `competition` de un quiz mixto (solo para apps anteriores: ver QuizSummary.kind). */
  code: CompetitionCode | 'MIXED';
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

/**
 * MIXED: quiz de 20 preguntas con fechas fijas (hora de Madrid): el de ligas se juega de martes a viernes a las 18:00
 * con los partidos de liga del fin de semana; el de Champions, de viernes a martes con los de Champions de esa semana.
 * MATCHDAY: los antiguos, de una liga y jornada.
 */
export type QuizKind = 'MIXED' | 'MATCHDAY';

export interface QuizWindow {
  /** WEEKEND: quiz de ligas. MIDWEEK: quiz de Champions. */
  kind: 'WEEKEND' | 'MIDWEEK';
  /** Limites de sus partidos: empiezan al cerrar el quiz (`start`) y acaban en el corte siguiente. */
  start: string;
  end: string;
  /** Primer y ultimo partido de sus preguntas. */
  firstKickoff: string;
  lastKickoff: string;
}

/** Lo que identifica un quiz: su tipo, su ventana o su liga y jornada, y las ligas de sus preguntas. */
export interface QuizIdentity {
  kind: QuizKind;
  window: QuizWindow | null;
  /** La liga en un quiz antiguo; en uno mixto, un comodin para apps anteriores (usar `competitions`). */
  competition: QuizCompetition;
  /** Ligas de las preguntas, en el orden en que salen. */
  competitions: QuizCompetition[];
  /** Jornada en un quiz antiguo; numero de quiz mixto en la temporada en uno mixto. */
  matchdayOrder: number;
  matchdayName: string;
}

export interface QuizSummary extends QuizIdentity {
  id: string;
  matchdayId: string;
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
  /** Liga del partido de la pregunta. */
  competition: QuizCompetition;
  options: QuizOptionCode[];
  selectedOption: QuizOptionCode | null;
  resolution: QuizResolution;
  correctOption: QuizOptionCode | null;
  pointsEarned: number | null;
}

/** Un quiz ya cerrado de un jugador, con las preguntas que respondio (ver QuizService.history en el backend). */
export interface QuizHistoryEntry extends QuizIdentity {
  quizId: string;
  seasonLabel: string;
  closesAt: string;
  status: QuizStatus;
  completedAt: string | null;
  points: number;
  /** Preguntas del quiz; `questions` solo trae las que respondio. */
  questionCount: number;
  questions: QuizQuestion[];
}

export interface QuizHistory {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  /** Nivel derivado de la XP (ya resuelto por el backend). */
  level: number;
  /** Equipo favorito con los colores de su bandera, o null. */
  favoriteTeam: FavoriteTeam | null;
  quizzes: QuizHistoryEntry[];
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
  /** Los quizzes abiertos (del que cierra antes al que mas tarda) y el ultimo mixto ya cerrado. */
  events: QuizSummary[];
  /** Lo mismo para apps anteriores al quiz mixto: el mixto repetido en cada liga. No usar. */
  quizzes: QuizSummary[];
}

export interface QuizRankingRow {
  position: number;
  /** Orden total de la fila (los empates comparten `position` pero no `rowNumber`): es el cursor para pedir tramos de la clasificacion. */
  rowNumber: number;
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
