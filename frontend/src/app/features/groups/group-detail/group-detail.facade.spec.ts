import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { Group, GroupMember } from '../../../core/models/group.model';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { GroupsService } from '../../../core/services/groups.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { GroupDetailFacade } from './group-detail.facade';

const API = environment.apiUrl;

function group(overrides: Partial<Group> = {}): Group {
  return {
    id: 'g1',
    name: 'Los del domingo',
    ownerId: 'owner',
    isPublic: false,
    comebackEnabled: true,
    comebackPointsPerBonus: 10,
    scoringMode: 'ONE_X_TWO',
    groupCompetitions: [],
    ...overrides,
  } as Group;
}

function member(userId: string, role: 'ADMIN' | 'MEMBER'): GroupMember {
  return { id: `m-${userId}`, userId, groupId: 'g1', role, user: { id: userId, name: userId } } as GroupMember;
}

describe('GroupDetailFacade — renombrar grupo', () => {
  let http: HttpTestingController;
  let toast: jasmine.SpyObj<ToastService>;
  let activeGroups: ActiveGroupService;
  let groups: GroupsService;

  /** Crea la fachada con `myUserId` como usuario actual y completa la carga inicial (grupo + miembros + catalogo). */
  function setup(myUserId: string, members: GroupMember[], initial: Group = group()): GroupDetailFacade {
    toast = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        GroupDetailFacade,
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'g1' } } } },
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: myUserId }) } },
        { provide: ToastService, useValue: toast },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    activeGroups = TestBed.inject(ActiveGroupService);
    groups = TestBed.inject(GroupsService);

    const facade = TestBed.inject(GroupDetailFacade);
    facade.init();
    http.expectOne(`${API}/groups/g1`).flush(initial);
    http.expectOne(`${API}/groups/g1/members`).flush(members);
    http.expectOne(`${API}/competitions`).flush([]);
    return facade;
  }

  beforeEach(() => localStorage.removeItem('quiniela.activeGroupId'));

  afterEach(() => http.verify());

  it('precarga el nombre actual y no hay cambios pendientes', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);

    expect(facade.nameInput()).toBe('Los del domingo');
    expect(facade.hasNameChanges()).toBe(false);
    expect(facade.hasAnyChanges()).toBe(false);
  });

  it('un admin ve el campo y editar el nombre activa "Guardar cambios"', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);

    facade.updateNameInput('Los del lunes');

    expect(facade.isAdmin()).toBe(true);
    expect(facade.hasNameChanges()).toBe(true);
    expect(facade.nameError()).toBeNull();
    expect(facade.hasAnyChanges()).toBe(true);
  });

  it('un miembro normal no puede cambiar el nombre aunque llame a la fachada', () => {
    const facade = setup('user', [member('user', 'MEMBER'), member('admin', 'ADMIN')]);

    facade.updateNameInput('Hackeado');

    expect(facade.isAdmin()).toBe(false);
    expect(facade.nameInput()).toBe('Los del domingo');
    expect(facade.hasAnyChanges()).toBe(false);
  });

  it('envia el nombre recortado y refleja el nuevo nombre en pantalla, listado y selector', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);
    // Listado ya cargado en memoria, como lo deja hasGroupGuard antes de entrar aqui.
    const mine = [group(), group({ id: 'g2', name: 'Otro grupo' })];
    groups.loadMyGroups().subscribe((loaded) => activeGroups.setGroups(loaded));
    http.expectOne(`${API}/groups/mine`).flush(mine);
    activeGroups.setActive('g1');

    facade.updateNameInput('  Los del lunes  ');
    facade.saveChanges();

    const req = http.expectOne(`${API}/groups/g1/rules`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'Los del lunes' });
    req.flush(group({ name: 'Los del lunes' }));

    expect(facade.group()?.name).toBe('Los del lunes');
    expect(facade.nameInput()).toBe('Los del lunes');
    expect(facade.hasAnyChanges()).toBe(false);
    expect(activeGroups.activeGroup()?.name).toBe('Los del lunes');
    expect(activeGroups.groups().find((g) => g.id === 'g2')?.name).toBe('Otro grupo');
    expect(toast.show).toHaveBeenCalledWith('Cambios guardados');
  });

  it('un nombre demasiado corto no se envia y avisa', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);

    facade.updateNameInput('ab');
    facade.saveChanges();

    expect(facade.nameError()).toContain('al menos 3');
    expect(toast.show).toHaveBeenCalledWith(jasmine.stringContaining('al menos 3'));
    http.expectNone(`${API}/groups/g1/rules`);
  });

  it('un nombre invalido no deja guardar a medias el resto de cambios pendientes', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);

    facade.togglePrivacy();
    facade.updateNameInput('   ');
    facade.saveChanges();

    http.expectNone(`${API}/groups/g1/rules`);
    expect(toast.show).toHaveBeenCalled();
  });

  it('el nombre viaja junto al resto de ajustes en una sola peticion', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);

    facade.togglePrivacy();
    facade.updateNameInput('Nuevo nombre');
    facade.saveChanges();

    const req = http.expectOne(`${API}/groups/g1/rules`);
    expect(req.request.body).toEqual({ name: 'Nuevo nombre', isPublic: true });
    req.flush(group({ name: 'Nuevo nombre', isPublic: true }));
  });

  it('si el servidor rechaza el cambio, se conserva lo escrito y se avisa', () => {
    const facade = setup('admin', [member('admin', 'ADMIN')]);

    facade.updateNameInput('Los del lunes');
    facade.saveChanges();
    http
      .expectOne(`${API}/groups/g1/rules`)
      .flush({ message: 'Solo un administrador del grupo puede hacer esto' }, { status: 403, statusText: 'Forbidden' });

    expect(facade.nameInput()).toBe('Los del lunes');
    expect(facade.group()?.name).toBe('Los del domingo');
    expect(toast.show).toHaveBeenCalledWith('Solo un administrador del grupo puede hacer esto');
  });
});
