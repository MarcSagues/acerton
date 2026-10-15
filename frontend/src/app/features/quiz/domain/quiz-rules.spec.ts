import { setLanguageForTests } from '../../../core/i18n/translate';
import { mixedSummary, quizMatch, quizQuestion, quizSummary } from '../testing/quiz.fixtures';
import {
  answeredCount,
  clockOffsetMs,
  isClosedError,
  isPendingForUser,
  isPastClose,
  loadFailureOf,
  optionLabel,
  pickHubQuizzes,
  questionOutcome,
  questionText,
  quizAction,
  quizErrorCode,
  quizErrorMessage,
  quizTitle,
  resumeIndex,
  windowDays,
} from './quiz-rules';

const participation = { answeredCount: 1, completedAt: null, points: 0, resolvedCount: 0, voidCount: 0 };

describe('quiz-rules', () => {
  afterEach(() => setLanguageForTests('es'));

  it('calcula el desfase del reloj con serverNow y lo ignora si no es una fecha', () => {
    const device = Date.parse('2026-10-12T10:00:00.000Z');
    expect(clockOffsetMs('2026-10-12T10:00:05.000Z', device)).toBe(5000);
    expect(clockOffsetMs('no-es-fecha', device)).toBe(0);
    expect(clockOffsetMs(null, device)).toBe(0);
  });

  it('el cierre se compara con la hora corregida', () => {
    const close = '2026-10-12T10:00:00.000Z';
    expect(isPastClose(close, Date.parse(close) - 1)).toBe(false);
    expect(isPastClose(close, Date.parse(close))).toBe(true);
  });

  it('la accion sale solo del estado y la participacion que manda el servidor', () => {
    expect(quizAction(quizSummary({ status: 'OPEN', participation: null }))).toBe('START');
    expect(quizAction(quizSummary({ status: 'OPEN', participation }))).toBe('CONTINUE');
    expect(quizAction(quizSummary({ status: 'OPEN', participation: { ...participation, completedAt: '2026-10-12T09:00:00Z' } }))).toBe(
      'REVIEW',
    );
    expect(quizAction(quizSummary({ status: 'CLOSED', participation }))).toBe('RESULTS');
    expect(quizAction(quizSummary({ status: 'FINISHED', participation: null }))).toBe('RESULTS');
    expect(quizAction(quizSummary({ status: 'SCHEDULED' }))).toBe('NONE');
  });

  it('el principal es el abierto que cierra antes; los demas abiertos van aparte y se ofrece el ultimo cerrado jugado', () => {
    const later = quizSummary({ id: 'later', status: 'OPEN', closesAt: '2026-10-20T16:00:00.000Z' });
    const sooner = quizSummary({ id: 'sooner', status: 'OPEN', closesAt: '2026-10-16T18:00:00.000Z' });
    const old = quizSummary({ id: 'old', status: 'FINISHED', closesAt: '2026-10-09T18:00:00.000Z', participation });
    const older = quizSummary({ id: 'older', status: 'FINISHED', closesAt: '2026-10-02T18:00:00.000Z', participation });
    expect(pickHubQuizzes([older, later, old, sooner])).toEqual({ primary: sooner, others: [later], previous: old });
  });

  it('sin quiz abierto, el principal es el ultimo cerrado y no se repite como anterior', () => {
    const only = quizSummary({ id: 'old', status: 'FINISHED', participation });
    expect(pickHubQuizzes([only])).toEqual({ primary: only, others: [], previous: null });
    expect(pickHubQuizzes([])).toEqual({ primary: null, others: [], previous: null });
  });

  it('un quiz cerrado sin participacion no se ofrece para revisar', () => {
    const picked = pickHubQuizzes([
      quizSummary({ id: 'old', status: 'FINISHED', participation: null }),
      quizSummary({ id: 'new', status: 'OPEN' }),
    ]);
    expect(picked.previous).toBeNull();
  });

  it('titula el quiz mixto por su ventana y el antiguo por su jornada', () => {
    expect(quizTitle(mixedSummary())).toBe('Quiz del finde');
    expect(quizTitle(mixedSummary({ window: { kind: 'MIDWEEK', start: '', end: '' } }))).toBe('Quiz entre semana');
    expect(quizTitle(quizSummary({ matchdayOrder: 9 }))).toBe('Jornada 9');
    setLanguageForTests('en');
    expect(quizTitle(mixedSummary())).toBe('Weekend quiz');
  });

  it('los dias de la ventana salen al mediodia de cada extremo (bien en cualquier zona horaria)', () => {
    // Del viernes 16 (00:00 en Madrid = 22:00 UTC del 15) al lunes 19 de octubre.
    expect(windowDays({ kind: 'WEEKEND', start: '2026-10-15T22:00:00.000Z', end: '2026-10-19T22:00:00.000Z' })).toEqual({
      from: '2026-10-16T10:00:00.000Z',
      to: '2026-10-19T10:00:00.000Z',
    });
  });

  it('pinta la pregunta a partir del tipo, con el equipo cuando toca', () => {
    const match = quizMatch();
    expect(questionText({ type: 'WINNER', match })).toBe('¿Quién ganará el partido?');
    expect(questionText({ type: 'HOME_CLEAN_SHEET', match })).toBe('¿Terminará Barça sin encajar goles?');
    expect(questionText({ type: 'AWAY_TWO_PLUS', match })).toBe('¿Marcará Real Madrid dos o más goles?');
    expect(questionText({ type: 'NUEVO_TIPO' as never, match })).toBe('Elige una opción');
    setLanguageForTests('en');
    expect(questionText({ type: 'OVER_2_5', match })).toBe('Will there be over 2.5 goals?');
  });

  it('pinta las opciones a partir de sus codigos (nombre corto del equipo si lo hay)', () => {
    const match = quizMatch({ awayTeamShort: null });
    expect(optionLabel('HOME', match)).toBe('Barça');
    expect(optionLabel('AWAY', match)).toBe('Real Madrid CF');
    expect(optionLabel('DRAW', match)).toBe('Empate');
    expect(optionLabel('YES', match)).toBe('Sí');
    expect(optionLabel('NO', match)).toBe('No');
  });

  it('distingue pendiente, anulada, acierto, fallo y sin responder', () => {
    expect(questionOutcome(quizQuestion({ resolution: 'PENDING', selectedOption: 'HOME' }))).toBe('pending');
    expect(questionOutcome(quizQuestion({ resolution: 'VOID', selectedOption: 'HOME' }))).toBe('void');
    expect(questionOutcome(quizQuestion({ resolution: 'RESOLVED', selectedOption: 'HOME', pointsEarned: 1 }))).toBe('hit');
    expect(questionOutcome(quizQuestion({ resolution: 'RESOLVED', selectedOption: 'AWAY', pointsEarned: 0 }))).toBe('miss');
    expect(questionOutcome(quizQuestion({ resolution: 'RESOLVED', selectedOption: null, pointsEarned: 0 }))).toBe('unanswered');
  });

  it('reanuda en la primera pregunta sin contestar', () => {
    const questions = [
      quizQuestion({ id: 'a', selectedOption: 'HOME' }),
      quizQuestion({ id: 'b', selectedOption: null }),
      quizQuestion({ id: 'c', selectedOption: null }),
    ];
    expect(resumeIndex(questions)).toBe(1);
    expect(answeredCount(questions)).toBe(1);
    expect(resumeIndex(questions.map((q) => ({ ...q, selectedOption: 'HOME' as const })))).toBe(0);
  });

  it('lee el code estable del error y lo traduce localmente', () => {
    expect(quizErrorCode({ statusCode: 409, message: 'x', code: 'QUIZ_CLOSED' })).toBe('QUIZ_CLOSED');
    expect(quizErrorCode({ code: 'OTRA_COSA' })).toBeNull();
    expect(quizErrorCode('texto')).toBeNull();
    expect(quizErrorMessage('QUIZ_INCOMPLETE')).toBe('Responde todas las preguntas antes de finalizar.');
    expect(isClosedError('QUIZ_CLOSED')).toBe(true);
    expect(isClosedError('QUIZ_NOT_OPEN')).toBe(true);
    expect(isClosedError('INVALID_QUIZ_ANSWER')).toBe(false);
  });

  it('clasifica los fallos de carga (0 = sin conexion)', () => {
    expect(loadFailureOf(0)).toBe('offline');
    expect(loadFailureOf(404)).toBe('notFound');
    expect(loadFailureOf(500)).toBe('error');
  });

  describe('punto rojo', () => {
    const now = Date.parse('2026-10-13T10:00:00.000Z');
    const hours = (h: number) => new Date(now + h * 3600_000).toISOString();

    it('el punto rojo sale con la jornada abierta que el usuario no ha terminado', () => {
      expect(isPendingForUser(quizSummary({ status: 'OPEN', closesAt: hours(5), participation: null }), now)).toBe(true);
      expect(isPendingForUser(quizSummary({ status: 'OPEN', closesAt: hours(5), participation }), now)).toBe(true);
      expect(
        isPendingForUser(
          quizSummary({ status: 'OPEN', closesAt: hours(5), participation: { ...participation, completedAt: '2026-10-13T09:00:00Z' } }),
          now,
        ),
      ).toBe(false);
      expect(isPendingForUser(quizSummary({ status: 'OPEN', closesAt: hours(-1), participation: null }), now)).toBe(false);
      expect(isPendingForUser(quizSummary({ status: 'SCHEDULED', closesAt: hours(5), participation: null }), now)).toBe(false);
    });
  });
});
