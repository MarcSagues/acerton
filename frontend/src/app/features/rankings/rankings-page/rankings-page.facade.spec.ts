import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Group } from '../../../core/models/group.model';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { RankingsPageFacade } from './rankings-page.facade';

const API = environment.apiUrl;

function group(id: string, competitionIds: string[] = ['laliga']): Group {
  return {
    id,
    name: `Grupo ${id}`,
    scoringMode: 'ONE_X_TWO',
    groupCompetitions: competitionIds.map((competitionId) => ({
      id: `gc-${competitionId}`,
      groupId: id,
      competitionId,
      isActive: true,
      competition: { id: competitionId, name: competitionId },
    })),
  } as unknown as Group;
}

describe('RankingsPageFacade — carga de la clasificacion', () => {
  let http: HttpTestingController;
  let activeGroups: ActiveGroupService;

  function setup(): RankingsPageFacade {
    localStorage.removeItem('quiniela.activeGroupId');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RankingsPageFacade,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1' }) } },
        { provide: TutorialService, useValue: { hasSeenTutorial: () => true, start: jasmine.createSpy('start') } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    activeGroups = TestBed.inject(ActiveGroupService);
    return TestBed.inject(RankingsPageFacade);
  }

  afterEach(() => http.verify());

  /** Responde la carga inicial de un grupo de UNA competicion: clasificacion, temporadas y evolucion. */
  function flushInitialLoad(groupId: string): void {
    http.expectOne((req) => req.url === `${API}/groups/${groupId}/rankings`).flush([]);
    http.expectOne(`${API}/groups/${groupId}/seasons`).flush([]);
    http.expectOne((req) => req.url === `${API}/groups/${groupId}/rankings/history`).flush({ matchdays: [] });
  }

  it('con el grupo ya en memoria pide la clasificacion al momento, sin esperar a /groups/:id', () => {
    const facade = setup();
    activeGroups.setGroups([group('g1'), group('g2')]);
    activeGroups.setActive('g1');

    TestBed.flushEffects();

    // Ni rastro de GET /groups/g1: se usa lo que ya trajo /groups/mine.
    http.expectNone(`${API}/groups/g1`);
    flushInitialLoad('g1');

    expect(facade.loading()).toBe(false);
    expect(facade.groupDetail()?.id).toBe('g1');
    expect(facade.scope()).toBe('laliga');
  });

  it('con varias competiciones activas arranca en la vista general', () => {
    const facade = setup();
    activeGroups.setGroups([group('g1', ['laliga', 'premier'])]);
    activeGroups.setActive('g1');

    TestBed.flushEffects();

    http.expectOne((req) => req.url === `${API}/groups/g1/rankings` && req.params.get('scope') === 'general').flush([]);
    http.expectOne(`${API}/groups/g1/seasons`).flush([]);
    expect(facade.scope()).toBe('general');
  });

  it('si el grupo activo no esta en memoria (p.ej. recien creado) lo pide antes de la clasificacion', () => {
    const facade = setup();
    activeGroups.setGroups([group('g1')]);
    activeGroups.setActive('nuevo');

    TestBed.flushEffects();

    expect(facade.loading()).toBe(true);
    http.expectNone((req) => req.url.endsWith('/rankings'));
    http.expectOne(`${API}/groups/nuevo`).flush(group('nuevo'));
    flushInitialLoad('nuevo');
    expect(facade.loading()).toBe(false);
  });

  it('cambiar de periodo pide solo la clasificacion, no vuelve a cargar el grupo', () => {
    const facade = setup();
    activeGroups.setGroups([group('g1')]);
    activeGroups.setActive('g1');
    TestBed.flushEffects();
    flushInitialLoad('g1');

    facade.setPeriod('WEEKLY');
    TestBed.flushEffects();

    http.expectOne((req) => req.url === `${API}/groups/g1/rankings` && req.params.get('period') === 'WEEKLY').flush([]);
    // Ninguna peticion mas: ni grupo ni temporadas.
    http.expectNone(`${API}/groups/g1`);
    http.expectNone(`${API}/groups/g1/seasons`);
  });

  it('refrescar la lista de grupos por detras (hasGroupGuard) no recarga la clasificacion', () => {
    setup();
    activeGroups.setGroups([group('g1')]);
    activeGroups.setActive('g1');
    TestBed.flushEffects();
    flushInitialLoad('g1');

    // Nuevo array (otros objetos) con el mismo grupo activo, como al volver /groups/mine.
    activeGroups.setGroups([group('g1')]);
    TestBed.flushEffects();

    http.expectNone((req) => req.url.endsWith('/rankings'));
    http.expectNone(`${API}/groups/g1/seasons`);
  });
});

describe('RankingsPageFacade — clasificacion de jornadas anteriores', () => {
  let http: HttpTestingController;
  let activeGroups: ActiveGroupService;
  let router: { navigate: jasmine.Spy };

  const history = {
    matchdays: [
      { matchdayId: 'm7', order: 7, winner: null, myPoints: 3 },
      { matchdayId: 'm6', order: 6, winner: null, myPoints: 1 },
      { matchdayId: 'm5', order: 5, winner: null, myPoints: 2 },
    ],
  };
  const rankingUrl = (groupId: string) => (req: { url: string }) => req.url === `${API}/groups/${groupId}/rankings`;

  function setup(competitionIds = ['laliga']): RankingsPageFacade {
    localStorage.removeItem('quiniela.activeGroupId');
    router = { navigate: jasmine.createSpy('navigate') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        RankingsPageFacade,
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1' }) } },
        { provide: TutorialService, useValue: { hasSeenTutorial: () => true, start: jasmine.createSpy('start') } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    activeGroups = TestBed.inject(ActiveGroupService);
    const facade = TestBed.inject(RankingsPageFacade);
    activeGroups.setGroups([group('g1', competitionIds)]);
    activeGroups.setActive('g1');
    TestBed.flushEffects();
    return facade;
  }

  /** Carga inicial de un grupo de una competicion, con tres jornadas finalizadas. */
  function loadWithHistory(): void {
    http.expectOne(rankingUrl('g1')).flush([]);
    http.expectOne(`${API}/groups/g1/seasons`).flush([]);
    http.expectOne((req) => req.url === `${API}/groups/g1/rankings/history`).flush(history);
  }

  /** Pasa a la clasificacion semanal (la unica con selector de jornada) y atiende su peticion. */
  function viewWeekly(facade: RankingsPageFacade): void {
    facade.setPeriod('WEEKLY');
    http.expectOne(rankingUrl('g1')).flush([]);
  }

  afterEach(() => http.verify());

  it('en Total nunca hay selector de jornadas: es siempre el acumulado de ahora', () => {
    const facade = setup();
    loadWithHistory();

    expect(facade.period()).toBe('TOTAL');
    expect(facade.showMatchdayPicker()).toBeFalse();
  });

  it('en Semanal ofrece las jornadas finalizadas en orden cronologico, la ultima seleccionada', () => {
    const facade = setup();
    loadWithHistory();
    viewWeekly(facade);

    expect(facade.showMatchdayPicker()).toBeTrue();
    expect(facade.matchdayChips().map((md) => md.order)).toEqual([5, 6, 7]);
    expect(facade.isMatchdaySelected('m7')).toBeTrue();
    expect(facade.isMatchdaySelected('m6')).toBeFalse();
    expect(facade.viewingPastMatchday()).toBeFalse();
  });

  it('elegir una jornada anterior pide lo puntuado en ESA jornada', () => {
    const facade = setup();
    loadWithHistory();
    viewWeekly(facade);

    facade.selectMatchday('m6');

    const request = http.expectOne(rankingUrl('g1'));
    expect(request.request.params.get('matchdayId')).toBe('m6');
    expect(request.request.params.get('scope')).toBe('laliga');
    expect(request.request.params.get('period')).toBe('WEEKLY');
    request.flush([{ userId: 'u1', points: 9, position: 1 }]);
    expect(facade.rows().length).toBe(1);
    expect(facade.viewingPastMatchday()).toBeTrue();
    expect(facade.selectedMatchdayOrder()).toBe(6);
    expect(facade.isMatchdaySelected('m6')).toBeTrue();
    expect(facade.isMatchdaySelected('m7')).toBeFalse();
  });

  it('volver a la ultima jornada usa la vista de siempre (sin matchdayId)', () => {
    const facade = setup();
    loadWithHistory();
    viewWeekly(facade);
    facade.selectMatchday('m5');
    http.expectOne(rankingUrl('g1')).flush([]);

    facade.selectMatchday('m7');

    const request = http.expectOne(rankingUrl('g1'));
    expect(request.request.params.has('matchdayId')).toBeFalse();
    request.flush([]);
    expect(facade.viewingPastMatchday()).toBeFalse();
  });

  it('pasar a Total deja la clasificacion de ahora, sin ninguna jornada anterior elegida', () => {
    const facade = setup();
    loadWithHistory();
    viewWeekly(facade);
    facade.selectMatchday('m6');
    http.expectOne(rankingUrl('g1')).flush([]);

    facade.setPeriod('TOTAL');

    const request = http.expectOne(rankingUrl('g1'));
    expect(request.request.params.get('period')).toBe('TOTAL');
    expect(request.request.params.has('matchdayId')).toBeFalse();
    request.flush([]);
    expect(facade.viewingPastMatchday()).toBeFalse();
    expect(facade.showMatchdayPicker()).toBeFalse();
    http.expectNone((req) => req.url.endsWith('/rankings/history'));
  });

  it('en Total no se puede elegir una jornada anterior', () => {
    const facade = setup();
    loadWithHistory();

    facade.selectMatchday('m6');

    http.expectNone(rankingUrl('g1'));
    expect(facade.viewingPastMatchday()).toBeFalse();
  });

  it('cambiar de competicion reinicia la jornada y pide las jornadas de la nueva', () => {
    const facade = setup(['laliga', 'premier']);
    http.expectOne((req) => rankingUrl('g1')(req) && req.params.get('scope') === 'general').flush([]);
    http.expectOne(`${API}/groups/g1/seasons`).flush([]);
    expect(facade.showMatchdayPicker()).toBeFalse(); // vista general: sin jornadas

    facade.setPeriod('WEEKLY'); // la semanal no tiene vista general: pasa a la primera competicion
    http.expectOne(rankingUrl('g1')).flush([]);
    http.expectOne((req) => req.url === `${API}/groups/g1/rankings/history`).flush(history);
    expect(facade.showMatchdayPicker()).toBeTrue();
    facade.selectMatchday('m6');
    http.expectOne(rankingUrl('g1')).flush([]);

    facade.setScope('premier');

    http.expectOne(rankingUrl('g1')).flush([]);
    http.expectOne((req) => req.url === `${API}/groups/g1/rankings/history` && req.params.get('competitionId') === 'premier').flush({ matchdays: [] });
    expect(facade.viewingPastMatchday()).toBeFalse();
    expect(facade.showMatchdayPicker()).toBeFalse(); // sin jornadas finalizadas, nada que elegir
  });

  it('una respuesta tardia de una jornada ya abandonada no pisa la actual', () => {
    const facade = setup();
    loadWithHistory();
    viewWeekly(facade);

    facade.selectMatchday('m6');
    const first = http.expectOne(rankingUrl('g1'));
    facade.selectMatchday('m5');
    const second = http.expectOne(rankingUrl('g1'));

    second.flush([{ userId: 'u1', points: 5, position: 1 }]);
    first.flush([{ userId: 'u2', points: 99, position: 1 }, { userId: 'u3', points: 98, position: 2 }]);

    expect(facade.rows().map((row) => row.points)).toEqual([5]);
  });

  it('tocar a un jugador viendo una jornada anterior abre sus quinielas de ESA jornada, sin preguntar al servidor', () => {
    const facade = setup();
    loadWithHistory();
    viewWeekly(facade);
    facade.selectMatchday('m6');
    http.expectOne(rankingUrl('g1')).flush([]);

    facade.viewUserPicks('u2');
    facade.viewUserPicks('u1');

    expect(router.navigate).toHaveBeenCalledWith(['/matchday', 'm6', 'results', 'u2']);
    expect(router.navigate).toHaveBeenCalledWith(['/matchday', 'm6', 'results']);
  });
});
