import { TestBed } from '@angular/core/testing';
import { CHANGELOG } from '../changelog/changelog';
import { PiqoDialogService } from '../../shared/ui/dialog/dialog.service';
import { TutorialService } from './tutorial.service';
import { LAST_SEEN_VERSION_KEY, WhatsNewService } from './whats-new.service';

describe('WhatsNewService (web: la versión es la última del historial)', () => {
  const latest = CHANGELOG[0].version;
  let dialog: { open: jasmine.Spy };
  let tutorialSeen: boolean;

  function build(): WhatsNewService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PiqoDialogService, useValue: dialog },
        { provide: TutorialService, useValue: { hasSeenTutorial: () => tutorialSeen } },
      ],
    });
    return TestBed.inject(WhatsNewService);
  }

  beforeEach(() => {
    localStorage.removeItem(LAST_SEEN_VERSION_KEY);
    dialog = jasmine.createSpyObj('PiqoDialogService', ['open']);
    tutorialSeen = true;
  });

  afterEach(() => localStorage.removeItem(LAST_SEEN_VERSION_KEY));

  it('la primera vez que se abre la versión enseña las novedades y apunta la versión', async () => {
    await build().checkOnLaunch();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    const config = dialog.open.calls.mostRecent().args[1];
    expect(config.data.version).toBe(latest);
    expect(config.data.entries.map((e: { version: string }) => e.version)).toEqual([latest]);
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe(latest);
  });

  it('la segunda vez que se abre esa misma versión ya no sale', async () => {
    const service = build();
    await service.checkOnLaunch();
    await service.checkOnLaunch();

    expect(dialog.open).toHaveBeenCalledTimes(1);
  });

  it('con una versión anterior guardada, enseña las novedades de la nueva', async () => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, '0.0.1');

    await build().checkOnLaunch();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe(latest);
  });

  it('un usuario nuevo (sin tutorial visto) no ve el aviso, pero la versión queda apuntada', async () => {
    tutorialSeen = false;

    await build().checkOnLaunch();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe(latest);
  });

  it('si ya se vio una versión más nueva que la instalada, no hace nada ni la pisa', async () => {
    localStorage.setItem(LAST_SEEN_VERSION_KEY, '99.0.0');

    await build().checkOnLaunch();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(localStorage.getItem(LAST_SEEN_VERSION_KEY)).toBe('99.0.0');
  });
});
