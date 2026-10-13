import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerProfileService } from '../../core/services/player-profile.service';
import { PlayerExactScore, PlayerProfile } from '../../core/models/player-profile.model';
import { TROPHIES } from '../profile/domain/trophies';
import { badgeArtId, badgeArtSrc } from '../../shared/utils/badge-art';

/** Perfil general de un jugador: datos publicos, grupos, Quiz, insignias y trofeos. */
@Injectable()
export class PlayerProfileFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly service = inject(PlayerProfileService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly profile = signal<PlayerProfile | null>(null);
  readonly trophies = TROPHIES;

  /** % de aciertos en grupos, o null si todavia no tiene predicciones puntuadas. */
  readonly hitRatePercent = computed(() => {
    const rate = this.profile()?.predictions.hitRate;
    return rate === null || rate === undefined ? null : Math.round(rate * 100);
  });

  init(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.service.get(userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Nombre corto del equipo si lo hay; si no, el completo. */
  teamName(score: PlayerExactScore, side: 'home' | 'away'): string {
    const short = side === 'home' ? score.homeTeamShort : score.awayTeamShort;
    return short?.trim() || (side === 'home' ? score.homeTeam : score.awayTeam);
  }

  artId(code: string): string | null {
    return badgeArtId(code);
  }

  artSrc(artId: string): string {
    return badgeArtSrc(artId);
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(['/profile']);
  }
}
