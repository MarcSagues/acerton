import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { QuizHistory, QuizHistoryEntry } from '../../../core/models/quiz.model';
import { LALIGA, PREMIER, quizQuestion } from '../testing/quiz.fixtures';
import { QuizHistoryFacade } from './quiz-history.facade';

const API = `${environment.apiUrl}/quiz/history`;

const hit = (id: string) =>
  quizQuestion({ id, selectedOption: 'HOME', resolution: 'RESOLVED', correctOption: 'HOME', pointsEarned: 1 });
const miss = (id: string) =>
  quizQuestion({ id, selectedOption: 'AWAY', resolution: 'RESOLVED', correctOption: 'HOME', pointsEarned: 0 });
const pending = (id: string) => quizQuestion({ id, selectedOption: 'HOME', resolution: 'PENDING', correctOption: null });

function entry(quizId: string, competition: typeof LALIGA, questions: ReturnType<typeof hit>[]): QuizHistoryEntry {
  return {
    quizId,
    competition,
    seasonLabel: '2026/27',
    matchdayOrder: 7,
    matchdayName: 'Jornada 7',
    closesAt: '2026-10-10T17:00:00.000Z',
    status: 'FINISHED',
    completedAt: null,
    points: questions.filter((q) => (q.pointsEarned ?? 0) > 0).length,
    questionCount: 10,
    questions,
  };
}

describe('QuizHistoryFacade', () => {
  let http: HttpTestingController;

  function setup(userId = 'u2'): QuizHistoryFacade {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QuizHistoryFacade,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1' }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ userId }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(QuizHistoryFacade);
  }

  function load(facade: QuizHistoryFacade, history: Partial<QuizHistory> = {}, userId = 'u2'): void {
    facade.init();
    http.expectOne(`${API}/${userId}`).flush({
      userId,
      name: 'Marta',
      quizzes: [
        entry('e2', PREMIER, [hit('a'), miss('b'), pending('c')]),
        entry('e1', LALIGA, [hit('d'), hit('e')]),
      ],
      ...history,
    });
  }

  afterEach(() => http.verify());

  it('carga el historial del usuario de la ruta y despliega el quiz mas reciente', () => {
    const facade = setup();
    load(facade);

    expect(facade.loading()).toBeFalse();
    expect(facade.quizzes().map((q) => q.quizId)).toEqual(['e2', 'e1']);
    expect(facade.expandedId()).toBe('e2');
    expect(facade.isMe()).toBeFalse();
  });

  it('el historial propio se reconoce por el id de la sesion', () => {
    const facade = setup('u1');
    load(facade, { userId: 'u1' }, 'u1');

    expect(facade.isMe()).toBeTrue();
  });

  it('cuenta aciertos y fallos; las pendientes no cuentan en ninguno', () => {
    const facade = setup();
    load(facade);

    expect(facade.stats(facade.quizzes()[0])).toEqual({ hits: 1, misses: 1 });
    expect(facade.totals()).toEqual({ quizzes: 2, hits: 3, misses: 1 });
  });

  it('lista las ligas jugadas sin repetirlas y filtra por liga recalculando los totales', () => {
    const facade = setup();
    load(facade);

    expect(facade.competitions().map((c) => c.id)).toEqual([PREMIER.id, LALIGA.id]);

    facade.selectCompetition(LALIGA.id);
    expect(facade.quizzes().map((q) => q.quizId)).toEqual(['e1']);
    expect(facade.totals()).toEqual({ quizzes: 1, hits: 2, misses: 0 });
    expect(facade.expandedId()).toBe('e1');

    facade.selectCompetition(null);
    expect(facade.quizzes().length).toBe(2);
  });

  it('un error de la peticion deja el estado de error', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/u2`).flush('x', { status: 403, statusText: 'Forbidden' });

    expect(facade.error()).toBeTrue();
    expect(facade.loading()).toBeFalse();
  });

  it('tocar un quiz lo despliega y volver a tocarlo lo pliega', () => {
    const facade = setup();
    load(facade);

    facade.toggle('e1');
    expect(facade.isExpanded('e1')).toBeTrue();
    facade.toggle('e1');
    expect(facade.isExpanded('e1')).toBeFalse();
  });
});
