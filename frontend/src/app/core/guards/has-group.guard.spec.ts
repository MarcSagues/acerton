import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Group } from '../models/group.model';
import { ActiveGroupService } from '../services/active-group.service';
import { AuthService } from '../services/auth.service';
import { hasGroupGuard } from './has-group.guard';

const MINE_URL = `${environment.apiUrl}/groups/mine`;

function group(id: string): Group {
  return { id, name: `Grupo ${id}` } as Group;
}

describe('hasGroupGuard', () => {
  let http: HttpTestingController;
  let activeGroups: ActiveGroupService;
  let router: Router;
  let tutorialCompleted: boolean;

  function runGuard(): ReturnType<typeof hasGroupGuard> {
    return TestBed.runInInjectionContext(() =>
      hasGroupGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
  }

  beforeEach(() => {
    localStorage.removeItem('quiniela.activeGroupId');
    tutorialCompleted = true;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { currentUser: () => ({ tutorialCompleted }) } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    activeGroups = TestBed.inject(ActiveGroupService);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    // Si algun test dejo una recarga en vuelo, se cierra para no contaminar
    // el flag de deduplicacion (es estado de modulo) del siguiente test.
    http.match(MINE_URL).forEach((req) => req.flush([]));
  });

  it('espera a la respuesta cuando todavia no hay grupo activo en memoria', async () => {
    const result = runGuard() as Observable<boolean | UrlTree>;
    const pending = firstValueFrom(result);

    http.expectOne(MINE_URL).flush([group('a')]);

    expect(await pending).toBe(true);
    expect(activeGroups.activeId()).toBe('a');
  });

  it('con grupo activo ya cargado entra al instante y refresca por detras', () => {
    activeGroups.setGroups([group('a'), group('b')]);
    activeGroups.setActive('b');

    const result = runGuard();

    expect(result).toBe(true);

    const refresh = http.expectOne(MINE_URL);
    refresh.flush([{ ...group('a') }, { ...group('b'), hasPendingPicks: true }]);

    expect(activeGroups.activeGroupHasPendingPicks()).toBe(true);
  });

  it('no lanza una segunda recarga mientras otra sigue en vuelo', () => {
    activeGroups.setGroups([group('a')]);

    expect(runGuard()).toBe(true);
    expect(runGuard()).toBe(true);

    http.expectOne(MINE_URL).flush([group('a')]);

    // Ya terminada, la siguiente navegacion vuelve a refrescar.
    expect(runGuard()).toBe(true);
    http.expectOne(MINE_URL).flush([group('a')]);
  });

  it('un error en la recarga por detras no rompe la navegacion ni borra los grupos', () => {
    activeGroups.setGroups([group('a')]);

    expect(runGuard()).toBe(true);
    http.expectOne(MINE_URL).flush('boom', { status: 500, statusText: 'Server Error' });

    expect(activeGroups.activeId()).toBe('a');
    expect(activeGroups.groups().length).toBe(1);
  });

  it('espera a la lista real si el grupo activo recien creado aun no esta en ella', async () => {
    activeGroups.setGroups([group('a')]);
    activeGroups.setActive('nuevo');

    const result = runGuard();
    expect(result).not.toBe(true);

    const pending = firstValueFrom(result as Observable<boolean | UrlTree>);
    http.expectOne(MINE_URL).flush([group('a'), group('nuevo')]);

    expect(await pending).toBe(true);
    expect(activeGroups.activeGroup()?.id).toBe('nuevo');
  });

  it('sin grupos manda a /welcome si nunca paso el tutorial', async () => {
    tutorialCompleted = false;
    const pending = firstValueFrom(runGuard() as Observable<boolean | UrlTree>);

    http.expectOne(MINE_URL).flush([]);

    const outcome = await pending;
    expect(outcome instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(outcome as UrlTree)).toBe('/welcome');
  });

  it('sin grupos manda a /groups si ya estuvo en alguno', async () => {
    const pending = firstValueFrom(runGuard() as Observable<boolean | UrlTree>);

    http.expectOne(MINE_URL).flush([]);

    expect(router.serializeUrl((await pending) as UrlTree)).toBe('/groups');
  });

  it('si la recarga por detras descubre que ya no quedan grupos, redirige igual', () => {
    const navigate = spyOn(router, 'navigateByUrl').and.resolveTo(true);
    activeGroups.setGroups([group('a')]);

    expect(runGuard()).toBe(true);
    http.expectOne(MINE_URL).flush([]);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(router.serializeUrl(navigate.calls.mostRecent().args[0] as UrlTree)).toBe('/groups');
  });
});
