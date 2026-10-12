import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { quizDetail, quizQuestion, withAnswer } from '../testing/quiz.fixtures';
import { QuizPlayFacade } from './quiz-play.facade';

const API = `${environment.apiUrl}/quiz`;
const CLOSED = { statusCode: 409, message: 'closed', code: 'QUIZ_CLOSED' };

describe('QuizPlayFacade', () => {
  let http: HttpTestingController;
  let router: { navigate: jasmine.Spy };

  function setup(): QuizPlayFacade {
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QuizPlayFacade,
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ quizId: 'q1' }) } } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(QuizPlayFacade);
  }

  function loaded(detail = quizDetail()): QuizPlayFacade {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/q1`).flush(detail);
    return facade;
  }

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('reanuda en la primera pregunta sin contestar, con el numero real de preguntas', () => {
    const facade = loaded();
    expect(facade.view()).toBe('question');
    expect(facade.stepIndex()).toBe(1);
    expect(facade.total()).toBe(3);
    expect(facade.answered()).toBe(1);
  });

  it('guarda la eleccion: Guardando mientras va y Guardado con la respuesta del servidor', () => {
    const facade = loaded();
    const detail = quizDetail();

    facade.select('YES');
    const put = http.expectOne(`${API}/q1/answers`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ answers: [{ questionId: 'qq2', option: 'YES' }] });
    expect(facade.currentSave()?.status).toBe('saving');
    expect(facade.displayedOption(facade.current()!)).toBe('YES');

    put.flush(withAnswer(detail, 'qq2', 'YES'));
    expect(facade.currentSave()?.status).toBe('saved');
    expect(facade.current()?.selectedOption).toBe('YES');
    expect(facade.answered()).toBe(2);
  });

  it('si el servidor rechaza el guardado, no se muestra como guardada y se puede reintentar', () => {
    const facade = loaded();

    facade.select('NO');
    http.expectOne(`${API}/q1/answers`).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(facade.currentSave()?.status).toBe('error');
    expect(facade.displayedOption(facade.current()!)).toBeNull();
    expect(facade.current()?.selectedOption).toBeNull();

    facade.retry('qq2');
    const retry = http.expectOne(`${API}/q1/answers`);
    expect(retry.request.body).toEqual({ answers: [{ questionId: 'qq2', option: 'NO' }] });
    retry.flush(withAnswer(quizDetail(), 'qq2', 'NO'));
    expect(facade.currentSave()?.status).toBe('saved');
  });

  it('sin conexion al guardar lo dice y conserva la respuesta confirmada anterior', () => {
    const facade = loaded();
    facade.previous(); // qq1, ya contestada con HOME
    facade.select('AWAY');
    http.expectOne(`${API}/q1/answers`).error(new ProgressEvent('error'), { status: 0 });

    expect(facade.currentSave()?.message).toBe('Sin conexión: no se ha guardado.');
    expect(facade.displayedOption(facade.current()!)).toBe('HOME');
  });

  it('las escrituras van en fila: la segunda sale cuando contesta la primera', () => {
    const facade = loaded();
    const detail = quizDetail();

    facade.select('YES'); // qq2
    facade.next();
    expect(facade.stepIndex()).toBe(1); // no avanza mientras guarda
    const first = http.expectOne(`${API}/q1/answers`);
    first.flush(withAnswer(detail, 'qq2', 'YES'));

    facade.next();
    facade.select('NO'); // qq3
    const second = http.expectOne(`${API}/q1/answers`);
    expect(second.request.body).toEqual({ answers: [{ questionId: 'qq3', option: 'NO' }] });
    second.flush(withAnswer(withAnswer(detail, 'qq2', 'YES'), 'qq3', 'NO'));

    expect(facade.allAnswered()).toBe(true);
    facade.next();
    expect(facade.view()).toBe('summary');
  });

  it('QUIZ_CLOSED al guardar: avisa, bloquea y ensena solo lo confirmado por el servidor', () => {
    const facade = loaded();

    facade.select('YES');
    http.expectOne(`${API}/q1/answers`).flush(CLOSED, { status: 409, statusText: 'Conflict' });
    expect(facade.closedWhilePlaying()).toBe(true);
    expect(facade.editable()).toBe(false);

    const closed = quizDetail({ canAnswer: false }, { status: 'CLOSED' });
    http.expectOne(`${API}/q1`).flush(closed);
    expect(facade.view()).toBe('results');
    expect(facade.questions().find((q) => q.id === 'qq2')?.selectedOption).toBeNull();
    expect(facade.saveStates()).toEqual({});

    facade.select('NO');
    http.expectNone(`${API}/q1/answers`);
  });

  it('al llegar la hora de cierre bloquea y pregunta al servidor una sola vez', fakeAsync(() => {
    const facade = setup();
    facade.init();
    const closesAt = '2026-10-17T14:00:00.000Z';
    const serverNow = new Date(Date.parse(closesAt) - 1500).toISOString();
    http.expectOne(`${API}/q1`).flush(quizDetail({ serverNow }, { closesAt }));
    expect(facade.editable()).toBe(true);

    tick(2000);
    expect(facade.editable()).toBe(false);
    facade.select('YES');
    http.expectNone(`${API}/q1/answers`);

    http.expectOne(`${API}/q1`).flush(quizDetail({ canAnswer: false, serverNow: closesAt }, { closesAt, status: 'CLOSED' }));
    expect(facade.closedWhilePlaying()).toBe(true);
    expect(facade.view()).toBe('results');

    tick(5000);
    http.expectNone(`${API}/q1`);
    discardPeriodicTasks();
  }));

  it('si el servidor sigue aceptando tras el refresco (cierre movido), se puede seguir jugando', fakeAsync(() => {
    const facade = setup();
    facade.init();
    const closesAt = '2026-10-17T14:00:00.000Z';
    http.expectOne(`${API}/q1`).flush(quizDetail({ serverNow: new Date(Date.parse(closesAt) - 500).toISOString() }, { closesAt }));

    tick(1000);
    const moved = '2026-10-17T16:00:00.000Z';
    http.expectOne(`${API}/q1`).flush(quizDetail({ serverNow: closesAt }, { closesAt: moved }));
    expect(facade.editable()).toBe(true);
    expect(facade.closedWhilePlaying()).toBe(false);
    discardPeriodicTasks();
  }));

  it('sin participacion ensena la entrada y Empezar la crea', () => {
    const fresh = quizDetail({}, { participation: null });
    const facade = loaded(fresh);
    expect(facade.view()).toBe('intro');
    expect(facade.editable()).toBe(false);

    facade.start();
    http.expectOne(`${API}/q1/participation`).flush(quizDetail());
    expect(facade.view()).toBe('question');
    expect(facade.editable()).toBe(true);
  });

  it('Finalizar con preguntas sin contestar no envia nada', () => {
    const facade = loaded();
    facade.complete();
    http.expectNone(`${API}/q1/complete`);
  });

  it('si el servidor responde QUIZ_INCOMPLETE al finalizar, se ensena el motivo', () => {
    const facade = loaded(
      quizDetail({
        questions: [
          quizQuestion({ id: 'qq1', selectedOption: 'HOME' }),
          quizQuestion({ id: 'qq2', type: 'BOTH_SCORE', options: ['YES', 'NO'], selectedOption: 'NO' }),
        ],
      }),
    );
    facade.complete();
    http
      .expectOne(`${API}/q1/complete`)
      .flush({ statusCode: 400, message: 'x', code: 'QUIZ_INCOMPLETE' }, { status: 400, statusText: 'Bad Request' });
    expect(facade.actionError()).toBe('Responde todas las preguntas antes de finalizar.');
  });

  it('un quiz cerrado abre en resultados, con pendientes y anuladas separadas', () => {
    const facade = loaded(
      quizDetail(
        {
          canAnswer: false,
          questions: [
            quizQuestion({ id: 'a', selectedOption: 'HOME', resolution: 'RESOLVED', correctOption: 'HOME', pointsEarned: 1 }),
            quizQuestion({ id: 'b', selectedOption: 'AWAY', resolution: 'PENDING' }),
            quizQuestion({ id: 'c', selectedOption: 'DRAW', resolution: 'VOID' }),
          ],
        },
        { status: 'CLOSED', participation: { answeredCount: 3, completedAt: null, points: 1, resolvedCount: 1, voidCount: 1 } },
      ),
    );
    expect(facade.view()).toBe('results');
    expect(facade.points()).toBe(1);
    expect(facade.validCount()).toBe(2);
    expect(facade.pendingCount()).toBe(1);
    expect(facade.questions().map((q) => facade.outcome(q))).toEqual(['hit', 'pending', 'void']);
  });

  it('distingue quiz inexistente, sin conexion y error', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/q1`).flush({ code: 'QUIZ_NOT_FOUND' }, { status: 404, statusText: 'Not Found' });
    expect(facade.loadState()).toBe('notFound');

    facade.load();
    http.expectOne(`${API}/q1`).error(new ProgressEvent('error'), { status: 0 });
    expect(facade.loadState()).toBe('offline');

    facade.load();
    http.expectOne(`${API}/q1`).flush('boom', { status: 503, statusText: 'Unavailable' });
    expect(facade.loadState()).toBe('error');
    // Sin datos inventados: nada que pintar salvo el error.
    expect(facade.detail()).toBeNull();
  });
});
