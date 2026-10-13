import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { environment } from '../../../environments/environment';
import { PlayerProfile } from '../../core/models/player-profile.model';
import { PiqoDialogService } from '../../shared/ui/dialog/dialog.service';
import { PlayerProfileFacade } from './player-profile.facade';

const API = `${environment.apiUrl}/players`;
const BADGE_STATS = `${environment.apiUrl}/badges/stats`;

function profile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    userId: 'u2',
    name: 'Marta',
    avatarUrl: null,
    avatarBackground: null,
    level: 3,
    favoriteTeam: null,
    isMe: false,
    predictions: { scored: 10, hits: 6, misses: 4, hitRate: 0.6 },
    exactScores: { hits: 0, played: 0, recent: [] },
    streak: { current: 2, longest: 9 },
    groupsCount: 2,
    sharedGroups: [],
    quiz: { seasonLabel: '2026/27', position: 3, total: 12, points: 21, quizzesPlayed: 5, hits: 7, misses: 4 },
    badges: [],
    ...overrides,
  };
}

describe('PlayerProfileFacade', () => {
  let http: HttpTestingController;
  let dialog: { open: jasmine.Spy };

  function setup(userId: string | null = 'u2'): PlayerProfileFacade {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        PlayerProfileFacade,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: PiqoDialogService, useValue: (dialog = { open: jasmine.createSpy('open') }) },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(userId ? { userId } : {}) } },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(PlayerProfileFacade);
  }

  afterEach(() => http.verify());

  it('carga el perfil del jugador de la ruta', () => {
    const facade = setup();
    facade.init();
    http.expectOne(BADGE_STATS).flush({ A: 12 });
    http.expectOne(`${API}/u2`).flush(profile());

    expect(facade.loading()).toBeFalse();
    expect(facade.error()).toBeFalse();
    expect(facade.profile()?.name).toBe('Marta');
  });

  it('el porcentaje de acierto va redondeado, y es null si todavia no tiene predicciones puntuadas', () => {
    const facade = setup();
    facade.init();
    http.expectOne(BADGE_STATS).flush({ A: 12 });
    http.expectOne(`${API}/u2`).flush(profile({ predictions: { scored: 3, hits: 2, misses: 1, hitRate: 2 / 3 } }));
    expect(facade.hitRatePercent()).toBe(67);

    facade.init();
    http.expectOne(BADGE_STATS).flush({ A: 12 });
    http.expectOne(`${API}/u2`).flush(profile({ predictions: { scored: 0, hits: 0, misses: 0, hitRate: null } }));
    expect(facade.hitRatePercent()).toBeNull();
  });

  it('un error de la peticion deja el estado de error', () => {
    const facade = setup();
    facade.init();
    http.expectOne(BADGE_STATS).flush({ A: 12 });
    http.expectOne(`${API}/u2`).flush('x', { status: 404, statusText: 'Not Found' });

    expect(facade.error()).toBeTrue();
    expect(facade.loading()).toBeFalse();
  });

  it('sin id en la ruta no pide nada y sale en error', () => {
    const facade = setup(null);
    facade.init();

    http.expectNone((req) => req.url.startsWith(API));
    expect(facade.error()).toBeTrue();
  });

  it('el nombre del equipo en un marcador clavado es el corto si lo hay y el completo si no', () => {
    const facade = setup();
    const score = {
      matchId: 'm1',
      homeTeam: 'FC Barcelona',
      awayTeam: 'Real Madrid CF',
      homeTeamShort: 'Barça',
      awayTeamShort: ' ',
      homeScore: 2,
      awayScore: 1,
      kickoff: '2026-10-12T18:00:00.000Z',
    };

    expect(facade.teamName(score, 'home')).toBe('Barça');
    expect(facade.teamName(score, 'away')).toBe('Real Madrid CF');
  });

  it('el porcentaje de acierto de los marcadores exactos va redondeado y es null sin pronosticos de marcador', () => {
    const facade = setup();
    facade.init();
    http.expectOne(BADGE_STATS).flush({});
    http.expectOne(`${API}/u2`).flush(profile({ exactScores: { hits: 8, played: 28, recent: [] } }));
    expect(facade.exactRatePercent()).toBe(29);

    facade.init();
    http.expectOne(BADGE_STATS).flush({});
    http.expectOne(`${API}/u2`).flush(profile({ exactScores: { hits: 0, played: 0, recent: [] } }));
    expect(facade.exactRatePercent()).toBeNull();
  });

  it('pulsar una insignia abre su detalle como conseguida, con el porcentaje de jugadores que la tienen', () => {
    const facade = setup();
    facade.init();
    http.expectOne(BADGE_STATS).flush({ STREAK_5: 12 });
    http.expectOne(`${API}/u2`).flush(profile());

    facade.openBadge({ code: 'STREAK_5', name: 'Racha de 5', description: 'Acierta 5 jornadas seguidas', earnedAt: '2026-10-01T10:00:00Z' });

    expect(dialog.open).toHaveBeenCalledTimes(1);
    const data = dialog.open.calls.mostRecent().args[1].data;
    expect(data.earned).toBeTrue();
    expect(data.percentage).toBe(12);
    expect(data.progress).toBeNull();
  });

  it('las insignias sin dibujo propio no rompen: artId es null para un codigo desconocido', () => {
    const facade = setup();

    expect(facade.artId('NO_EXISTE')).toBeNull();
  });
});
