import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { CurrentMatchdayEntry } from '../../../core/models/matchday.model';
import { AdsService } from '../../../core/services/ads.service';
import { AuthService } from '../../../core/services/auth.service';
import { BottomSheetService } from '../../../shared/ui/bottom-sheet/bottom-sheet.service';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { CurrentMatchdayFacade } from './current-matchday.facade';

const DAY_MS = 24 * 60 * 60 * 1000;

function entry(opts: { canPredict: boolean; firstKickoffInDays: number; opensAtInDays?: number }): CurrentMatchdayEntry {
  const kickoff = new Date(Date.now() + opts.firstKickoffInDays * DAY_MS).toISOString();
  return {
    competition: { id: 'c1', name: 'La Liga' },
    matchday: {
      id: 'md1',
      competitionId: 'c1',
      season: 2026,
      name: 'Regular Season - 8',
      order: 8,
      closesAt: kickoff,
      status: 'OPEN',
      canPredict: opts.canPredict,
      // Lo que mandaba el backend antes (y sigue mandando por compatibilidad): ya no se lee.
      ...(opts.opensAtInDays !== undefined
        ? { opensAt: new Date(Date.now() + opts.opensAtInDays * DAY_MS).toISOString() }
        : {}),
      matches: [
        { id: 'm1', status: 'SCHEDULED', kickoff, homeTeam: 'Local', awayTeam: 'Visitante' },
        { id: 'm2', status: 'SCHEDULED', kickoff, homeTeam: 'Otro', awayTeam: 'Rival' },
      ],
    },
  } as unknown as CurrentMatchdayEntry;
}

describe('CurrentMatchdayFacade — la jornada mas proxima siempre esta abierta', () => {
  function setup(): CurrentMatchdayFacade {
    localStorage.removeItem('quiniela.activeGroupId');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CurrentMatchdayFacade,
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: AuthService, useValue: { currentUser: () => ({ id: 'u1', name: 'Test' }) } },
        { provide: AdsService, useValue: {} },
        { provide: ToastService, useValue: { show: jasmine.createSpy('show') } },
        { provide: PiqoDialogService, useValue: {} },
        { provide: BottomSheetService, useValue: {} },
      ],
    });
    return TestBed.inject(CurrentMatchdayFacade);
  }

  it('acepta pronosticos aunque el primer partido este a dos semanas (parón de selecciones)', () => {
    const facade = setup();
    facade.entries.set([entry({ canPredict: true, firstKickoffInDays: 14 })]);

    expect(facade.pickingAllowed()).toBe(true);
    expect(facade.cicloTitulo(facade.entries()[0])).toBe('Abierta · cierra en');
    expect(facade.isMatchPending(facade.entries()[0].matchday.matches[0])).toBe(true);
  });

  it('no se deja bloquear por un opensAt futuro (versiones anteriores del backend / compatibilidad)', () => {
    const facade = setup();
    facade.entries.set([entry({ canPredict: true, firstKickoffInDays: 14, opensAtInDays: 10 })]);

    expect(facade.pickingAllowed()).toBe(true);
    expect(facade.cicloTitulo(facade.entries()[0])).not.toContain('Próxima');
  });

  it('el punto rojo de pendientes cuenta la jornada abierta aunque falten semanas', () => {
    const facade = setup();
    const e = entry({ canPredict: true, firstKickoffInDays: 21 });
    facade.entries.set([e]);

    expect(facade.hasPendingPicks(e)).toBe(true);
  });

  it('una jornada que todavia no le toca (previsualizada con "siguiente") sigue bloqueada y se anuncia como proxima', () => {
    const facade = setup();
    const e = entry({ canPredict: false, firstKickoffInDays: 6 });
    facade.entries.set([e]);

    expect(facade.pickingAllowed()).toBe(false);
    expect(facade.cicloTitulo(e)).toBe('Próxima · empieza en');
    expect(facade.hasPendingPicks(e)).toBe(false);
  });
});
