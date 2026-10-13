import { TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { LALIGA, PREMIER, overview, quizDetail, quizSummary, ranking, rankingRow } from '../testing/quiz.fixtures';
import { QUIZ_COMPETITION_STORAGE_KEY, QuizHubFacade } from './quiz-hub.facade';

const API = `${environment.apiUrl}/quiz`;

describe('QuizHubFacade', () => {
  let http: HttpTestingController;
  let router: { navigate: jasmine.Spy };
  let toast: { show: jasmine.Spy };

  function setup(): QuizHubFacade {
    localStorage.removeItem(QUIZ_COMPETITION_STORAGE_KEY);
    router = { navigate: jasmine.createSpy('navigate') };
    toast = { show: jasmine.createSpy('show') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        QuizHubFacade,
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1' }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(QuizHubFacade);
  }

  const rankingReq = (competitionId: string | null = null): TestRequest =>
    http.expectOne(
      (req) => req.url === `${API}/rankings` && (req.params.get('competitionId') ?? null) === competitionId,
    );

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('carga el resumen y la clasificacion general, sin enviar userId ni groupId', () => {
    const facade = setup();
    facade.init();

    http.expectOne(`${API}/overview`).flush(overview());
    const req = rankingReq(null);
    expect(req.request.params.keys().some((k) => k === 'userId' || k === 'groupId')).toBe(false);
    expect(req.request.params.get('limit')).toBe('20');
    req.flush(ranking());

    expect(facade.overviewState()).toBe('ready');
    expect(facade.selectedCompetitionId()).toBe(LALIGA.id); // la que tiene jornada abierta
    expect(facade.primaryQuiz()?.id).toBe('q1');
    expect(facade.rankingState()).toBe('ready');
    expect(facade.rankingRows().length).toBe(1);
  });

  it('el selector de juego y el filtro de la clasificacion son independientes', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/overview`).flush(overview());
    rankingReq(null).flush(ranking());

    facade.selectCompetition(PREMIER.id);
    http.expectNone(`${API}/rankings`);
    expect(facade.rankingCompetitionId()).toBeNull();
    expect(facade.primaryQuiz()?.id).toBe('q2');

    facade.setRankingCompetition(LALIGA.id);
    rankingReq(LALIGA.id).flush(ranking({ competitionId: LALIGA.id }));
    expect(facade.selectedCompetitionId()).toBe(PREMIER.id);
  });

  it('descarta la respuesta tardia de un filtro anterior de la clasificacion', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/overview`).flush(overview());
    rankingReq(null).flush(ranking());

    facade.setRankingCompetition(LALIGA.id);
    const slow = rankingReq(LALIGA.id);
    facade.setRankingCompetition(PREMIER.id);
    rankingReq(PREMIER.id).flush(ranking({ rows: [rankingRow({ userId: 'premier', name: 'Premier' })] }));
    slow.flush(ranking({ rows: [rankingRow({ userId: 'laliga', name: 'LaLiga' })] }));

    expect(facade.rankingRows().map((r) => r.userId)).toEqual(['premier']);
  });

  it('el contador no pide la clasificacion; al pasar el cierre pide el resumen una sola vez', fakeAsync(() => {
    const facade = setup();
    facade.init();
    // El servidor va 2 s antes del cierre de q1.
    http
      .expectOne(`${API}/overview`)
      .flush(overview({ serverNow: new Date(Date.parse('2026-10-17T14:00:00.000Z') - 2000).toISOString() }));
    rankingReq(null).flush(ranking());
    expect(facade.countdown(facade.primaryQuiz()!)).toBe('00:02');

    tick(1000);
    http.expectNone(`${API}/rankings`);
    http.expectNone(`${API}/overview`);

    tick(1000);
    expect(facade.action(facade.primaryQuiz()!)).toBe('NONE'); // bloqueado hasta que conteste el servidor
    http.expectOne(`${API}/overview`).flush(overview({ quizzes: [quizSummary({ status: 'CLOSED' })] }));

    tick(5000);
    http.expectNone(`${API}/overview`);
    http.expectNone(`${API}/rankings`);
    expect(facade.action(facade.primaryQuiz()!)).toBe('RESULTS');
    discardPeriodicTasks();
  }));

  describe('clasificacion: scroll infinito y salto a mi puesto', () => {
    const row = (n: number, overrides: Partial<ReturnType<typeof rankingRow>> = {}) =>
      rankingRow({ userId: `u${n + 100}`, position: n, rowNumber: n, ...overrides });
    const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => row(from + i));
    const me = rankingRow({ userId: 'u1', name: 'Yo', position: 57, rowNumber: 57, points: 3 });
    const rankingAt = (cursor: string) =>
      http.expectOne((req) => req.url === `${API}/rankings` && req.params.get('cursor') === cursor);

    /** Abre el Quiz con las filas 1 y 2 cargadas y 80 jugadores, yo en la fila 57. */
    function open(): QuizHubFacade {
      const facade = setup();
      facade.init();
      http.expectOne(`${API}/overview`).flush(overview());
      rankingReq(null).flush(ranking({ rows: range(1, 2), me, total: 80 }));
      return facade;
    }

    it('el scroll infinito pide la pagina que sigue al final del tramo y la une a lo cargado', () => {
      const facade = open();

      facade.loadAfter(2);

      const request = rankingAt('2');
      expect(request.request.params.get('limit')).toBe('20');
      request.flush(ranking({ rows: range(3, 4), me, total: 80 }));
      expect(facade.rankingRows().map((r) => r.rowNumber)).toEqual([1, 2, 3, 4]);
      const last = facade.rankingItems().at(-1);
      expect(last).toEqual({ kind: 'more', key: 'more-4', end: 4 });
    });

    it('no pide dos veces el mismo tramo a la vez', () => {
      const facade = open();

      facade.loadAfter(2);
      facade.loadAfter(2);

      const requests = http.match((req) => req.url === `${API}/rankings` && req.params.get('cursor') === '2');
      expect(requests.length).toBe(1);
      requests[0].flush(ranking({ rows: range(3, 4), me, total: 80 }));
    });

    it('con todas las filas cargadas ya no hay centinela', () => {
      const facade = setup();
      facade.init();
      http.expectOne(`${API}/overview`).flush(overview());
      rankingReq(null).flush(ranking({ rows: range(1, 3), me: null, total: 3 }));

      expect(facade.rankingItems().some((item) => item.kind === 'more')).toBeFalse();
    });

    it('mi puesto lejos: se carga una ventana alrededor de mi fila y queda un hueco con el principio', async () => {
      const facade = open();
      expect(facade.meLoaded()).toBeFalse();

      const loading = facade.ensureMeLoaded();

      const request = rankingAt('46'); // filas 47..67 (10 por encima y 10 por debajo de la 57)
      expect(request.request.params.get('limit')).toBe('21');
      request.flush(ranking({ rows: [...range(47, 56), me, ...range(58, 67)], me, total: 80 }));
      expect(await loading).toBeTrue();
      expect(facade.meLoaded()).toBeTrue();
      const gap = facade.rankingItems().find((item) => item.kind === 'gap');
      expect(gap).toEqual({ kind: 'gap', key: 'gap-47', hidden: 44, before: 47 });
    });

    it('si mi fila ya esta cargada no pide nada', async () => {
      const facade = setup();
      facade.init();
      http.expectOne(`${API}/overview`).flush(overview());
      const near = rankingRow({ userId: 'u1', name: 'Yo', position: 2, rowNumber: 2 });
      rankingReq(null).flush(ranking({ rows: [row(1), near], me: near, total: 80 }));

      expect(await facade.ensureMeLoaded()).toBeTrue();

      http.expectNone((req) => req.url === `${API}/rankings`);
    });

    it('sin participaciones propias (me es null) no hay a donde saltar', async () => {
      const facade = setup();
      facade.init();
      http.expectOne(`${API}/overview`).flush(overview());
      rankingReq(null).flush(ranking({ rows: range(1, 2), me: null, total: 80 }));

      expect(await facade.ensureMeLoaded()).toBeFalse();
    });

    it('el hueco carga las filas que preceden al segundo tramo y, al cerrarse, se unen', async () => {
      const facade = open();
      const loading = facade.ensureMeLoaded();
      rankingAt('46').flush(ranking({ rows: [...range(47, 56), me, ...range(58, 67)], me, total: 80 }));
      await loading;

      facade.loadBefore(47);

      const request = rankingAt('26'); // filas 27..46
      expect(request.request.params.get('limit')).toBe('20');
      request.flush(ranking({ rows: range(27, 46), me, total: 80 }));
      const gap = facade.rankingItems().find((item) => item.kind === 'gap');
      expect(gap).toEqual({ kind: 'gap', key: 'gap-27', hidden: 24, before: 27 });
    });

    it('mientras dura el salto con scroll suave el scroll infinito esta pausado', () => {
      const facade = open();
      facade.jumping.set(true);

      facade.loadAfter(2);

      http.expectNone((req) => req.url === `${API}/rankings` && req.params.get('cursor') === '2');
    });

    it('un error al cargar mas avisa y deja volver a intentarlo', () => {
      const facade = open();

      facade.loadAfter(2);
      rankingAt('2').error(new ProgressEvent('error'), { status: 0 });

      expect(toast.show).toHaveBeenCalled();
      expect(facade.loadingMore()).toBeFalse();
      facade.loadAfter(2);
      rankingAt('2').flush(ranking({ rows: range(3, 4), me, total: 80 }));
      expect(facade.rankingRows().length).toBe(4);
    });
  });

  it('distingue clasificacion vacia, error y sin conexion (sin inventar datos)', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/overview`).flush('boom', { status: 500, statusText: 'Server Error' });
    rankingReq(null).flush(ranking({ rows: [], total: 0 }));
    expect(facade.overviewState()).toBe('error');
    expect(facade.primaryQuiz()).toBeNull();
    expect(facade.rankingState()).toBe('ready');
    expect(facade.rankingRows()).toEqual([]);

    facade.setRankingCompetition(LALIGA.id);
    rankingReq(LALIGA.id).error(new ProgressEvent('error'), { status: 0 });
    expect(facade.rankingState()).toBe('offline');

    facade.retryRanking();
    rankingReq(LALIGA.id).flush('boom', { status: 500, statusText: 'Server Error' });
    expect(facade.rankingState()).toBe('error');
  });

  it('Iniciar crea la participacion y entra en el quiz', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/overview`).flush(overview());
    rankingReq(null).flush(ranking());

    facade.open(facade.primaryQuiz()!);
    const post = http.expectOne(`${API}/q1/participation`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({});
    post.flush(quizDetail());
    expect(router.navigate).toHaveBeenCalledWith(['/quiz', 'q1']);
  });

  it('si al iniciar ya esta cerrado (QUIZ_CLOSED), avisa y refresca el resumen', () => {
    const facade = setup();
    facade.init();
    http.expectOne(`${API}/overview`).flush(overview());
    rankingReq(null).flush(ranking());

    facade.open(facade.primaryQuiz()!);
    http
      .expectOne(`${API}/q1/participation`)
      .flush({ statusCode: 409, message: 'closed', code: 'QUIZ_CLOSED' }, { status: 409, statusText: 'Conflict' });

    expect(router.navigate).not.toHaveBeenCalled();
    expect(toast.show).toHaveBeenCalledWith('El quiz ya está cerrado: no se admiten más respuestas.');
    http.expectOne(`${API}/overview`).flush(overview());
  });

  it('Continuar y Ver resultados entran sin crear nada', () => {
    const facade = setup();
    facade.init();
    const participation = { answeredCount: 1, completedAt: null, points: 0, resolvedCount: 0, voidCount: 0 };
    http.expectOne(`${API}/overview`).flush(overview({ quizzes: [quizSummary({ participation })] }));
    rankingReq(null).flush(ranking());

    expect(facade.action(facade.primaryQuiz()!)).toBe('CONTINUE');
    facade.open(facade.primaryQuiz()!);
    http.expectNone(`${API}/q1/participation`);
    expect(router.navigate).toHaveBeenCalledWith(['/quiz', 'q1']);
  });
});
