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
