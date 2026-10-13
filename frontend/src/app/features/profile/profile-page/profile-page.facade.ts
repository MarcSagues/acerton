import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { BadgesService } from '../../../core/services/badges.service';
import { Badge, UserProfile } from '../../../core/models/profile.model';
import { BadgeProgress } from '../../../core/models/badge-progress.model';
import { badgeArtId, badgeArtSrc } from '../../../shared/utils/badge-art';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TrophyDetailDialogComponent, TrophyDetailData } from '../trophy-detail-dialog.component';
import { BadgeDetailDialogComponent, BadgeDetailData } from '../badge-detail-dialog.component';
import { TROPHIES } from '../domain/trophies';
import { t } from '../../../core/i18n/translate';
import { badgeName, badgeDescription } from '../../../shared/utils/badge-text';
import { distinctBadgeCount } from '../../../shared/utils/badge-count';

export interface BadgePreviewItem {
  badge: Badge;
  earned: boolean;
}

@Injectable()
export class ProfilePageFacade {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly dialog = inject(PiqoDialogService);
  readonly authService = inject(AuthService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly tutorialService = inject(TutorialService);
  private readonly badgesService = inject(BadgesService);

  readonly loading = signal(true);
  readonly profile = signal<UserProfile | null>(null);
  private readonly badgeCatalog = signal<Badge[]>([]);
  private readonly badgeStats = signal<Record<string, number>>({});
  private readonly badgeProgress = signal<Record<string, BadgeProgress>>({});

  /** Hasta 8 insignias (2 filas de 4, como la vitrina de trofeos): primero las conseguidas, y de faltar se completa con las pendientes en gris. */
  readonly badgePreview = computed<BadgePreviewItem[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const earnedCodes = new Set(profile.badges.map((b) => b.badge.code));
    const withEarned = this.badgeCatalog().map((badge) => ({ badge, earned: earnedCodes.has(badge.code) }));
    const earned = withEarned.filter((b) => b.earned);
    const pending = withEarned.filter((b) => !b.earned);
    return [...earned, ...pending].slice(0, 8);
  });

  artId(code: string): string | null {
    return badgeArtId(code);
  }

  artSrc(artId: string): string {
    return badgeArtSrc(artId);
  }

  openBadge(item: BadgePreviewItem): void {
    this.dialog.open<BadgeDetailDialogComponent, void, BadgeDetailData>(BadgeDetailDialogComponent, {
      data: {
        artId: this.artId(item.badge.code),
        name: badgeName(item.badge),
        description: badgeDescription(item.badge),
        earned: item.earned,
        percentage: this.badgeStats()[item.badge.code] ?? null,
        progress: item.earned ? null : (this.badgeProgress()[item.badge.code] ?? null),
      },
    });
  }

  /**
   * Racha global (product-rules.md § "Rachas y estadisticas"): cada jornada
   * de cada competicion presente en los grupos del usuario cuenta una vez,
   * sin duplicar entre grupos — distinta de la racha por grupo (mas abajo,
   * una por grupo por separado).
   */
  readonly globalCurrentStreak = computed(() => this.profile()?.globalStreak.currentStreak ?? 0);
  readonly globalLongestStreak = computed(() => this.profile()?.globalStreak.longestStreak ?? 0);
  readonly badgeCount = computed(() => distinctBadgeCount(this.profile()?.badges ?? []));
  /**
   * Perfil se puede abrir sin grupo (quien solo juega al Quiz): estadisticas,
   * historico, normas y el tutorial dependen de un grupo y se ocultan o se
   * cambian por un acceso a Grupos. Sale del perfil (no de ActiveGroupService),
   * que puede no estar cargado si se llega directo desde el Quiz.
   */
  readonly hasGroups = computed(() => (this.profile()?.groups.length ?? 0) > 0);
  readonly trophies = TROPHIES;

  openTrophy(trophy: TrophyDetailData): void {
    this.dialog.open<TrophyDetailDialogComponent, void, TrophyDetailData>(TrophyDetailDialogComponent, {
      data: trophy,
    });
  }

  /** Repetir el tutorial no reinicia el flag del backend, solo lo vuelve a mostrar desde Tabla. */
  replayTutorial(): void {
    const scoringMode = this.activeGroupService.activeGroup()?.scoringMode ?? 'ONE_X_TWO';
    this.tutorialService.start(scoringMode);
    this.router.navigate(['/rankings']);
  }

  logout(): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      data: {
        title: t('profilePage.cerrarSesion'),
        message: t('profilePage.vasCerrarSesionEste'),
        confirmLabel: t('profilePage.cerrarSesion'),
      },
    });

    dialogRef.closed.subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.authService.logout().subscribe(() => this.router.navigate(['/login']));
    });
  }

  init(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.badgesService.getCatalog().subscribe((catalog) => this.badgeCatalog.set(catalog));
    this.badgesService.getStats().subscribe((stats) => this.badgeStats.set(stats));
    this.badgesService.getProgress().subscribe((progress) => this.badgeProgress.set(progress));
  }
}
