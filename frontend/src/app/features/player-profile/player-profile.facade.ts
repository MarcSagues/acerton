import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { PlayerProfileService } from '../../core/services/player-profile.service';
import { BadgesService } from '../../core/services/badges.service';
import { PiqoDialogService } from '../../shared/ui/dialog/dialog.service';
import { PlayerBadge, PlayerExactScore, PlayerProfile } from '../../core/models/player-profile.model';
import { TROPHIES } from '../profile/domain/trophies';
import { badgeArtId, badgeArtSrc } from '../../shared/utils/badge-art';
import { badgeDescription, badgeName } from '../../shared/utils/badge-text';
import { BadgeDetailDialogComponent, BadgeDetailData } from '../profile/badge-detail-dialog.component';

/** Perfil general de un jugador: datos publicos, grupos, Quiz, insignias y trofeos. */
@Injectable()
export class PlayerProfileFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly service = inject(PlayerProfileService);
  private readonly badgesService = inject(BadgesService);
  private readonly dialog = inject(PiqoDialogService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly profile = signal<PlayerProfile | null>(null);
  readonly trophies = TROPHIES;
  /** % de jugadores que tiene cada insignia (para el detalle); si falla, el detalle sale sin ese dato. */
  private readonly badgeStats = signal<Record<string, number>>({});

  /** % de aciertos en grupos, o null si todavia no tiene predicciones puntuadas. */
  readonly hitRatePercent = computed(() => {
    const rate = this.profile()?.predictions.hitRate;
    return rate === null || rate === undefined ? null : Math.round(rate * 100);
  });

  /** % de acierto de los marcadores exactos (clavados sobre pronosticados con partido jugado), o null si no hay ninguno. */
  readonly exactRatePercent = computed(() => {
    const exact = this.profile()?.exactScores;
    return exact && exact.played > 0 ? Math.round((exact.hits / exact.played) * 100) : null;
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
    this.badgesService.getStats().subscribe({ next: (stats) => this.badgeStats.set(stats), error: () => undefined });
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

  /** Nombre de la insignia en el idioma de la app. */
  badgeLabel(badge: PlayerBadge): string {
    return badgeName(badge);
  }

  /** Pulsar una insignia abre su detalle, igual que en tu perfil (es una insignia conseguida por el jugador). */
  openBadge(badge: PlayerBadge): void {
    this.dialog.open<BadgeDetailDialogComponent, void, BadgeDetailData>(BadgeDetailDialogComponent, {
      data: {
        artId: this.artId(badge.code),
        name: badgeName(badge),
        description: badgeDescription(badge),
        earned: true,
        percentage: this.badgeStats()[badge.code] ?? null,
        progress: null,
      },
    });
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
