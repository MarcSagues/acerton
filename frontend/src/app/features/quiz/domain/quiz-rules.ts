import {
  QuizErrorCode,
  QuizMatch,
  QuizOptionCode,
  QuizQuestion,
  QuizQuestionType,
  QuizSummary,
} from '../../../core/models/quiz.model';
import { TranslationKey, t } from '../../../core/i18n/translate';

/**
 * Reglas de presentacion del Quiz de jornada, sin Angular. Nada de esto decide
 * apertura, cierre ni puntos: eso lo dice siempre el servidor. Aqui solo se
 * traduce lo que llega (tipo de pregunta, codigos de opcion, estado) a texto y
 * a la accion que toca ofrecer.
 */

/** Desfase del reloj del dispositivo respecto al servidor, en ms (positivo = el servidor va por delante). */
export function clockOffsetMs(serverNow: string | null | undefined, deviceNowMs: number): number {
  if (!serverNow) return 0;
  const server = Date.parse(serverNow);
  return Number.isFinite(server) ? server - deviceNowMs : 0;
}

/**
 * true si, segun la hora corregida, ya ha pasado el cierre. Solo sirve para
 * bloquear los controles mientras se vuelve a preguntar al servidor.
 */
export function isPastClose(closesAt: string, nowMs: number): boolean {
  const close = Date.parse(closesAt);
  return Number.isFinite(close) && nowMs >= close;
}

export type QuizAction = 'START' | 'CONTINUE' | 'REVIEW' | 'RESULTS' | 'NONE';

/** Accion principal de la tarjeta de una jornada, solo a partir de lo que dice el servidor. */
export function quizAction(quiz: QuizSummary): QuizAction {
  const participation = quiz.participation;
  if (quiz.status === 'OPEN') {
    if (!participation) return 'START';
    return participation.completedAt ? 'REVIEW' : 'CONTINUE';
  }
  if (quiz.status === 'CLOSED' || quiz.status === 'FINISHED') return 'RESULTS';
  return 'NONE';
}

export function quizActionLabel(action: QuizAction): string {
  switch (action) {
    case 'START':
      return t('quiz.iniciar');
    case 'CONTINUE':
      return t('quiz.continuar');
    case 'REVIEW':
      return t('quiz.revisarRespuestas');
    case 'RESULTS':
      return t('quiz.verResultados');
    default:
      return t('quiz.abrePronto');
  }
}

/**
 * Las jornadas de una competicion que se ensenan en el centro: la principal
 * (una abierta si la hay; si no, la mas reciente) y, aparte, una anterior en la
 * que el usuario participo y que sigue mereciendo un acceso para revisarla.
 */
export function pickCompetitionQuizzes(quizzes: readonly QuizSummary[]): {
  primary: QuizSummary | null;
  previous: QuizSummary | null;
} {
  if (quizzes.length === 0) return { primary: null, previous: null };
  const byRecency = [...quizzes].sort((a, b) => b.matchdayOrder - a.matchdayOrder || b.closesAt.localeCompare(a.closesAt));
  const primary = byRecency.find((q) => q.status === 'OPEN') ?? byRecency[0];
  const previous = byRecency.find((q) => q.id !== primary.id && q.participation !== null) ?? null;
  return { primary, previous };
}

export function quizStatusLabel(quiz: QuizSummary): string {
  switch (quiz.status) {
    case 'OPEN':
      return t('quiz.estadoAbierto');
    case 'CLOSED':
      return t('quiz.estadoCerrado');
    case 'FINISHED':
      return t('quiz.estadoFinalizado');
    default:
      return t('quiz.estadoProgramado');
  }
}

/** Nombre corto del equipo si lo hay; si no, el completo. */
export function teamName(match: QuizMatch, side: 'home' | 'away'): string {
  const short = side === 'home' ? match.homeTeamShort : match.awayTeamShort;
  const full = side === 'home' ? match.homeTeam : match.awayTeam;
  return short?.trim() || full;
}

const QUESTION_KEYS: Record<QuizQuestionType, { key: TranslationKey; team?: 'home' | 'away' }> = {
  WINNER: { key: 'quiz.preguntaGanador' },
  BOTH_SCORE: { key: 'quiz.preguntaAmbosMarcan' },
  OVER_2_5: { key: 'quiz.preguntaMas25' },
  HOME_CLEAN_SHEET: { key: 'quiz.preguntaPorteriaCero', team: 'home' },
  AWAY_CLEAN_SHEET: { key: 'quiz.preguntaPorteriaCero', team: 'away' },
  HOME_TWO_PLUS: { key: 'quiz.preguntaDosOMas', team: 'home' },
  AWAY_TWO_PLUS: { key: 'quiz.preguntaDosOMas', team: 'away' },
  WIN_BY_TWO_PLUS: { key: 'quiz.preguntaGanaPorDos' },
};

/** Texto de la pregunta a partir de su tipo (un tipo que la app todavia no conoce sale con un texto generico). */
export function questionText(question: Pick<QuizQuestion, 'type' | 'match'>): string {
  const entry = QUESTION_KEYS[question.type];
  if (!entry) return t('quiz.preguntaGenerica');
  return entry.team ? t(entry.key, { team: teamName(question.match, entry.team) }) : t(entry.key);
}

/** Texto de una opcion: HOME/AWAY con el equipo, DRAW empate, YES/NO si/no. */
export function optionLabel(option: QuizOptionCode, match: QuizMatch): string {
  switch (option) {
    case 'HOME':
      return teamName(match, 'home');
    case 'AWAY':
      return teamName(match, 'away');
    case 'DRAW':
      return t('quiz.opcionEmpate');
    case 'YES':
      return t('quiz.opcionSi');
    case 'NO':
      return t('quiz.opcionNo');
    default:
      return String(option);
  }
}

export type QuestionOutcome = 'pending' | 'void' | 'hit' | 'miss' | 'unanswered';

/** Estado de una pregunta en resultados: solo con lo que ha resuelto el servidor. */
export function questionOutcome(question: QuizQuestion): QuestionOutcome {
  if (question.resolution === 'VOID') return 'void';
  if (question.resolution !== 'RESOLVED') return 'pending';
  if (question.selectedOption === null) return 'unanswered';
  return (question.pointsEarned ?? 0) > 0 ? 'hit' : 'miss';
}

export function outcomeLabel(outcome: QuestionOutcome): string {
  switch (outcome) {
    case 'pending':
      return t('quiz.resultadoPendiente');
    case 'void':
      return t('quiz.resultadoAnulada');
    case 'hit':
      return t('quiz.resultadoAcierto');
    case 'miss':
      return t('quiz.resultadoFallo');
    default:
      return t('quiz.resultadoSinResponder');
  }
}

/** Primera pregunta sin contestar (para reanudar), o la primera si estan todas. */
export function resumeIndex(questions: readonly QuizQuestion[]): number {
  const index = questions.findIndex((q) => q.selectedOption === null);
  return index === -1 ? 0 : index;
}

export function answeredCount(questions: readonly QuizQuestion[]): number {
  return questions.filter((q) => q.selectedOption !== null).length;
}

const KNOWN_ERROR_CODES: readonly QuizErrorCode[] = [
  'QUIZ_NOT_FOUND',
  'QUIZ_NOT_OPEN',
  'QUIZ_CLOSED',
  'QUIZ_INCOMPLETE',
  'INVALID_QUIZ_ANSWER',
];

/** Lee el `code` estable del cuerpo de error del servidor; null si no lo trae o no es de los del quiz. */
export function quizErrorCode(body: unknown): QuizErrorCode | null {
  if (!body || typeof body !== 'object') return null;
  const code = (body as { code?: unknown }).code;
  return typeof code === 'string' && (KNOWN_ERROR_CODES as readonly string[]).includes(code) ? (code as QuizErrorCode) : null;
}

export function quizErrorMessage(code: QuizErrorCode | null): string {
  switch (code) {
    case 'QUIZ_NOT_FOUND':
      return t('quiz.errorNoEncontrado');
    case 'QUIZ_NOT_OPEN':
      return t('quiz.errorNoAbierto');
    case 'QUIZ_CLOSED':
      return t('quiz.errorCerrado');
    case 'QUIZ_INCOMPLETE':
      return t('quiz.errorIncompleto');
    case 'INVALID_QUIZ_ANSWER':
      return t('quiz.errorRespuestaInvalida');
    default:
      return t('quiz.errorGuardar');
  }
}

export type LoadFailure = 'offline' | 'notFound' | 'error';

/** Tipo de fallo de una carga a partir del estado HTTP (0 = sin conexion). */
export function loadFailureOf(status: number | undefined): LoadFailure {
  if (status === 0) return 'offline';
  if (status === 404) return 'notFound';
  return 'error';
}

/** true si el error significa que el quiz ya no admite respuestas (cerrado o todavia sin abrir). */
export function isClosedError(code: QuizErrorCode | null): boolean {
  return code === 'QUIZ_CLOSED' || code === 'QUIZ_NOT_OPEN';
}
