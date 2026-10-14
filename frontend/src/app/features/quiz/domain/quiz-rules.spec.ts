import { QuizCompetition } from '../../../core/models/quiz.model';
import { setLanguageForTests } from '../../../core/i18n/translate';
import { LALIGA, PREMIER, quizMatch, quizQuestion, quizSummary } from '../testing/quiz.fixtures';
import {
  answeredCount,
  clockOffsetMs,
  closesSoon,
  isClosedError,
  isPendingForUser,
  isPastClose,
  loadFailureOf,
  optionLabel,
  pickCompetitionQuizzes,
  questionOutcome,
  questionText,
  quizAction,
  quizErrorCode,
  quizErrorMessage,
  resumeIndex,
  sortCompetitionsByClose,
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

  it('con una jornada nueva abierta y la anterior jugada, prioriza la nueva y ofrece revisar la anterior', () => {
    const previous = quizSummary({ id: 'old', matchdayOrder: 8, status: 'CLOSED', participation });
    const current = quizSummary({ id: 'new', matchdayOrder: 9, status: 'OPEN' });
    const picked = pickCompetitionQuizzes([previous, current]);
    expect(picked.primary?.id).toBe('new');
    expect(picked.previous?.id).toBe('old');
  });

  it('sin jornada abierta, la principal es la mas reciente y no se repite como anterior', () => {
    const only = quizSummary({ id: 'old', status: 'FINISHED', participation });
    expect(pickCompetitionQuizzes([only])).toEqual({ primary: only, previous: null });
    expect(pickCompetitionQuizzes([])).toEqual({ primary: null, previous: null });
  });

  it('una jornada anterior sin participacion no se ofrece para revisar', () => {
    const picked = pickCompetitionQuizzes([
      quizSummary({ id: 'old', matchdayOrder: 8, status: 'FINISHED', participation: null }),
      quizSummary({ id: 'new', matchdayOrder: 9, status: 'OPEN' }),
    ]);
    expect(picked.previous).toBeNull();
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

  describe('pestañas de liga', () => {
    const now = Date.parse('2026-10-13T10:00:00.000Z');
    const hours = (h: number) => new Date(now + h * 3600_000).toISOString();
    const SERIE_A: QuizCompetition = { id: 'c-seriea', code: 'SERIE_A', name: 'Serie A', logoUrl: null };

    it('ordena las ligas de la que cierra antes a la que cierra mas tarde y deja al final las que no tienen nada pendiente', () => {
      const quizzes = [
        quizSummary({ id: 'a', competition: LALIGA, status: 'OPEN', closesAt: hours(50) }),
        quizSummary({ id: 'b', competition: PREMIER, status: 'OPEN', closesAt: hours(5) }),
        quizSummary({ id: 'c', competition: SERIE_A, status: 'FINISHED', closesAt: hours(-30) }),
      ];
      expect(sortCompetitionsByClose([SERIE_A, LALIGA, PREMIER], quizzes, now).map((c) => c.id)).toEqual([
        PREMIER.id,
        LALIGA.id,
        SERIE_A.id,
      ]);
    });

    it('cuenta tambien las programadas, se queda con el cierre mas proximo de cada liga e ignora los ya pasados', () => {
      const quizzes = [
        quizSummary({ id: 'a1', competition: LALIGA, status: 'SCHEDULED', closesAt: hours(100) }),
        quizSummary({ id: 'a2', competition: LALIGA, status: 'OPEN', closesAt: hours(-1) }),
        quizSummary({ id: 'b', competition: PREMIER, status: 'SCHEDULED', closesAt: hours(30) }),
      ];
      expect(sortCompetitionsByClose([LALIGA, PREMIER], quizzes, now).map((c) => c.id)).toEqual([PREMIER.id, LALIGA.id]);
    });

    it('el reloj sale solo con la jornada abierta y menos de 24 h para el cierre', () => {
      expect(closesSoon(quizSummary({ status: 'OPEN', closesAt: hours(23.9) }), now)).toBe(true);
      expect(closesSoon(quizSummary({ status: 'OPEN', closesAt: hours(24) }), now)).toBe(false);
      expect(closesSoon(quizSummary({ status: 'OPEN', closesAt: hours(-0.1) }), now)).toBe(false);
      expect(closesSoon(quizSummary({ status: 'SCHEDULED', closesAt: hours(2) }), now)).toBe(false);
    });

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
