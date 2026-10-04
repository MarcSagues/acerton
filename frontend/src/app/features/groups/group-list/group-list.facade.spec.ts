import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Group } from '../../../core/models/group.model';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { GroupsService } from '../../../core/services/groups.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { GroupListFacade } from './group-list.facade';

const API = environment.apiUrl;
const group = (id: string): Group => ({ id, name: `Grupo ${id}` }) as Group;

describe('GroupListFacade — carga de la lista', () => {
  let http: HttpTestingController;

  /** `preloaded`: lista que ya habria dejado hasGroupGuard o una visita anterior a Grupos. */
  function setup(preloaded: Group[] = []): GroupListFacade {
    localStorage.removeItem('quiniela.activeGroupId');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GroupListFacade,
        { provide: Router, useValue: { url: '/groups', navigate: jasmine.createSpy('navigate') } },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    if (preloaded.length > 0) {
      TestBed.inject(GroupsService).loadMyGroups().subscribe();
      http.expectOne(`${API}/groups/mine`).flush(preloaded);
    }
    return TestBed.inject(GroupListFacade);
  }

  afterEach(() => http.verify());

  it('la primera vez (sin lista en memoria) muestra el spinner hasta que llega la respuesta', () => {
    const facade = setup();
    expect(facade.loading()).toBe(true);

    facade.init();
    http.expectOne(`${API}/groups/mine`).flush([group('a')]);
    http.expectOne(`${API}/users/me/profile`).flush({ groups: [] });

    expect(facade.loading()).toBe(false);
    expect(facade.groups().length).toBe(1);
  });

  it('con la lista ya en memoria se pinta al instante (sin spinner) y se refresca por detras', () => {
    const facade = setup([group('a'), group('b')]);
    expect(facade.loading()).toBe(false);
    expect(facade.groups().length).toBe(2);

    facade.init();
    // Sigue pidiendo la lista fresca (puntos rojos, posiciones), pero sin bloquear la pantalla.
    http.expectOne(`${API}/groups/mine`).flush([group('a'), group('b'), group('c')]);
    http.expectOne(`${API}/users/me/profile`).flush({ groups: [] });

    expect(facade.loading()).toBe(false);
    expect(facade.groups().length).toBe(3);
    expect(TestBed.inject(ActiveGroupService).groups().length).toBe(3);
  });

  it('si la recarga falla con la lista ya en memoria, se sigue viendo la lista', () => {
    const facade = setup([group('a')]);

    facade.init();
    http.expectOne(`${API}/groups/mine`).flush('boom', { status: 500, statusText: 'Server Error' });
    http.expectOne(`${API}/users/me/profile`).flush({ groups: [] });

    expect(facade.loading()).toBe(false);
    expect(facade.groups().length).toBe(1);
  });
});
