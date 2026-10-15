import { EnvironmentInjector, createEnvironmentInjector } from '@angular/core';
import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { quizDetail, quizQuestion, withAnswer } from '../testing/quiz.fixtures';
import { AUTO_ADVANCE_MS, DRAW_FINISH_MS, QuizPlayFacade } from './quiz-play.facade';

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

  it('al salir de la pantalla las respuestas en fila se siguen enviando: cuentan aunque no se termine', () => {
    setup();
    // La pantalla en su propio inyector, para poder cerrarla sin tirar el HttpTestingController.
    const screen = createEnvironmentInjector([QuizPlayFacade], TestBed.inject(EnvironmentInjector));
    const facade = screen.get(QuizPlayFacade);
    facade.init();
    http.expectOne(`${API}/q1`).flush(quizDetail());

    facade.select('YES'); // qq2, en vuelo
    const first = http.expectOne(`${API}/q1/answers`);
    screen.destroy(); // se sale justo despues de elegir

    expect(first.cancelled).toBeFalse();
    first.flush(withAnswer(quizDetail(), 'qq2', 'YES'));
  });

  /** Remate del contorno animado (como el 1X2) y, si se guardo, la pausa antes de pasar sola. */
  const DRAW_DONE = DRAW_FINISH_MS + 40;

  it('guarda la eleccion: contorno mientras va, Guardado al cerrarse y pasa sola a la siguiente', fakeAsync(() => {
    const facade = loaded();
    const detail = quizDetail();

    facade.select('YES');
    const put = http.expectOne(`${API}/q1/answers`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ answers: [{ questionId: 'qq2', option: 'YES' }] });
    expect(facade.currentSave()?.status).toBe('saving');
    expect(facade.savingOption(facade.current()!)).toBe('YES');
    tick(300);
    expect(parseFloat(facade.drawPercent(facade.current()!))).toBeGreaterThan(0);

    put.flush(withAnswer(detail, 'qq2', 'YES'));
    // El resultado no se aplica hasta que el contorno se ha cerrado del todo.
    expect(facade.currentSave()?.status).toBe('saving');
    tick(DRAW_DONE);
    expect(facade.currentSave()?.status).toBe('saved');
    expect(facade.current()?.selectedOption).toBe('YES');
    expect(facade.answered()).toBe(2);
    expect(facade.stepIndex()).toBe(1);

    tick(AUTO_ADVANCE_MS);
    expect(facade.stepIndex()).toBe(2);
    discardPeriodicTasks();
  }));

  it('si el servidor rechaza el guardado, no se marca, no avanza y se puede reintentar', fakeAsync(() => {
    const facade = loaded();

    facade.select('NO');
    http.expectOne(`${API}/q1/answers`).flush('boom', { status: 500, statusText: 'Server Error' });
    tick(DRAW_DONE + AUTO_ADVANCE_MS);

    expect(facade.currentSave()?.status).toBe('error');
    expect(facade.displayedOption(facade.current()!)).toBeNull();
    expect(facade.current()?.selectedOption).toBeNull();
    expect(facade.stepIndex()).toBe(1);

    facade.retry('qq2');
    const retry = http.expectOne(`${API}/q1/answers`);
    expect(retry.request.body).toEqual({ answers: [{ questionId: 'qq2', option: 'NO' }] });
    retry.flush(withAnswer(quizDetail(), 'qq2', 'NO'));
    tick(DRAW_DONE);
    expect(facade.currentSave()?.status).toBe('saved');
    tick(AUTO_ADVANCE_MS);
    expect(facade.stepIndex()).toBe(2);
    discardPeriodicTasks();
  }));

  it('sin conexion al guardar lo dice y conserva la respuesta confirmada anterior', fakeAsync(() => {
    const facade = loaded();
    facade.previous(); // qq1, ya contestada con HOME
    facade.select('AWAY');
    http.expectOne(`${API}/q1/answers`).error(new ProgressEvent('error'), { status: 0 });
    tick(DRAW_DONE);

    expect(facade.currentSave()?.message).toBe('Sin conexión: no se ha guardado.');
    expect(facade.displayedOption(facade.current()!)).toBe('HOME');
    discardPeriodicTasks();
  }));

  it('volver a pulsar la respuesta ya guardada no reenvia nada y pasa a la siguiente', () => {
    const facade = loaded();
    facade.previous(); // qq1, ya contestada con HOME
    facade.select('HOME');
    http.expectNone(`${API}/q1/answers`);
    expect(facade.stepIndex()).toBe(1);
  });

  it('Saltar deja la pregunta sin responder; desde la ultima lleva al resumen', () => {
    const facade = loaded();
    facade.skip();
    expect(facade.stepIndex()).toBe(2);
    facade.skip();
    expect(facade.view()).toBe('summary');
    expect(facade.answered()).toBe(1);
  });

  it('las escrituras van en fila y un guardado que acaba despues de Saltar no mueve la pregunta actual', fakeAsync(() => {
    const facade = loaded();
    const detail = quizDetail();

    facade.select('YES'); // qq2
    facade.skip(); // a qq3 mientras qq2 se guarda
    expect(facade.stepIndex()).toBe(2);
    facade.select('NO'); // qq3: espera en la fila
    const first = http.expectOne(`${API}/q1/answers`);
    expect(first.request.body).toEqual({ answers: [{ questionId: 'qq2', option: 'YES' }] });
    first.flush(withAnswer(detail, 'qq2', 'YES'));

    const second = http.expectOne(`${API}/q1/answers`);
    expect(second.request.body).toEqual({ answers: [{ questionId: 'qq3', option: 'NO' }] });
    tick(DRAW_DONE + AUTO_ADVANCE_MS);
    expect(facade.stepIndex()).toBe(2); // el avance de qq2 no aplica: ya no es la actual

    second.flush(withAnswer(withAnswer(detail, 'qq2', 'YES'), 'qq3', 'NO'));
    tick(DRAW_DONE + AUTO_ADVANCE_MS);
    expect(facade.allAnswered()).toBe(true);
    expect(facade.view()).toBe('summary'); // era la ultima
    discardPeriodicTasks();
  }));

  it('al cambiar una respuesta desde el resumen, al guardarla vuelve al resumen', fakeAsync(() => {
    const facade = loaded();
    facade.showSummary();
    facade.goToQuestion(0);
    facade.select('AWAY');
    http.expectOne(`${API}/q1/answers`).flush(withAnswer(quizDetail(), 'qq1', 'AWAY'));
    tick(DRAW_DONE + AUTO_ADVANCE_MS);
    expect(facade.view()).toBe('summary');
    discardPeriodicTasks();
  }));

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
