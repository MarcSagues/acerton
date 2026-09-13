import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { trophyById } from '../domain/trophies';

export interface SeasonStanding {
  position: number;
  name: string;
  points: number;
  isMe: boolean;
}

export interface SeasonMatchday {
  order: number;
  winnerName: string;
  myPoints: number;
}

const MOCK_NAMES = ['Carlos M.', 'Laura G.', 'Javier R.', 'Sofía P.', 'Diego L.'];

/**
 * Resumen de temporada de un trofeo: como los propios trofeos (ver
 * domain/trophies.ts), Piqo todavia no tiene un modelo de datos real para
 * esto ("falta fijar el criterio"), asi que esta pantalla genera un
 * historial y una clasificacion de muestra a partir del año elegido, solo
 * para previsualizar el diseno — nunca se presenta como dato real (ver el
 * aviso en la plantilla).
 */
@Injectable()
export class TrophySeasonFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  private readonly trophyId = signal('');
  readonly year = signal(0);
  readonly demoCalloutDismissed = signal(false);

  readonly trophyName = computed(() => trophyById(this.trophyId())?.name ?? 'Trofeo');

  readonly standings = computed<SeasonStanding[]>(() => {
    const myName = this.authService.currentUser()?.name ?? 'Tú';
    const seed = this.year() || 1;
    const base = 60 + (seed % 7) * 3;
    const points = [base, base - 4, base - 9, base - 13, base - 18, base - 21];
    const names = [myName, ...MOCK_NAMES];
    return names.map((name, i) => ({
      position: i + 1,
      name,
      points: points[i],
      isMe: i === 0,
    }));
  });

  readonly matchdays = computed<SeasonMatchday[]>(() => {
    const myName = this.authService.currentUser()?.name ?? 'Tú';
    const seed = this.year() || 1;
    return Array.from({ length: 6 }, (_, i) => {
      const winsIt = (seed + i) % 3 !== 0;
      return {
        order: i + 1,
        winnerName: winsIt ? myName : MOCK_NAMES[i % MOCK_NAMES.length],
        myPoints: 6 + ((seed + i * 3) % 9),
      };
    });
  });

  init(): void {
    this.trophyId.set(this.route.snapshot.paramMap.get('trophyId') ?? '');
    this.year.set(Number(this.route.snapshot.paramMap.get('year')) || new Date().getFullYear());
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
