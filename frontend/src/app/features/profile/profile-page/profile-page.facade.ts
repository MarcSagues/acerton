import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { BadgesService } from '../../../core/services/badges.service';
import { PushNotificationsService } from '../../../core/services/push-notifications.service';
import { Badge, UserProfile } from '../../../core/models/profile.model';
import { BadgeProgress } from '../../../core/models/badge-progress.model';
import { usernameHint, validateUsername } from '../../../shared/username.util';
import { badgeArtId } from '../../../shared/utils/badge-art';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TrophyDetailDialogComponent, TrophyDetailData } from '../trophy-detail-dialog.component';
import { BadgeDetailDialogComponent, BadgeDetailData } from '../badge-detail-dialog.component';
import { TROPHIES } from '../domain/trophies';

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
  private readonly pushNotificationsService = inject(PushNotificationsService);

  readonly loading = signal(true);
  readonly profile = signal<UserProfile | null>(null);
  private readonly badgeCatalog = signal<Badge[]>([]);
  private readonly badgeStats = signal<Record<string, number>>({});
  private readonly badgeProgress = signal<Record<string, BadgeProgress>>({});

  /** Hasta 5 insignias: primero las conseguidas, y de faltar se completa con las pendientes en gris. */
  readonly badgePreview = computed<BadgePreviewItem[]>(() => {
    const profile = this.profile();
    if (!profile) return [];
    const earnedCodes = new Set(profile.badges.map((b) => b.badge.code));
    const withEarned = this.badgeCatalog().map((badge) => ({ badge, earned: earnedCodes.has(badge.code) }));
    const earned = withEarned.filter((b) => b.earned);
    const pending = withEarned.filter((b) => !b.earned);
    return [...earned, ...pending].slice(0, 5);
  });

  artId(code: string): string | null {
    return badgeArtId(code);
  }

  openBadge(item: BadgePreviewItem): void {
    this.dialog.open<BadgeDetailDialogComponent, void, BadgeDetailData>(BadgeDetailDialogComponent, {
      data: {
        artId: this.artId(item.badge.code),
        name: item.badge.name,
        description: item.badge.description,
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
  readonly badgeCount = computed(() => this.profile()?.badges.length ?? 0);
  readonly trophies = TROPHIES;

  openTrophy(trophy: TrophyDetailData): void {
    this.dialog.open<TrophyDetailDialogComponent, void, TrophyDetailData>(TrophyDetailDialogComponent, {
      data: trophy,
    });
  }

  readonly nameInput = signal('');
  readonly nameSaving = signal(false);
  readonly nameError = signal<string | null>(null);

  readonly nameChangeAvailableAt = computed(() => {
    const iso = this.authService.currentUser()?.nameChangeAvailableAt;
    return iso ? new Date(iso) : null;
  });

  /** Feedback en vivo mientras se escribe. */
  nameHint(): string | null {
    const value = this.nameInput();
    if (!value) return null;
    return usernameHint(validateUsername(value));
  }

  canSaveName(): boolean {
    const name = this.nameInput().trim();
    const current = this.authService.currentUser();
    return (
      !this.nameSaving() &&
      !!name &&
      !!current &&
      name !== current.name &&
      validateUsername(this.nameInput()) === null
    );
  }

  /** Repetir el tutorial no reinicia el flag del backend, solo lo vuelve a mostrar desde Tabla. */
  replayTutorial(): void {
    const scoringMode = this.activeGroupService.activeGroup()?.scoringMode ?? 'ONE_X_TWO';
    this.tutorialService.start(scoringMode);
    this.router.navigate(['/rankings']);
  }

  saveName(): void {
    if (!this.canSaveName()) {
      return;
    }
    const name = this.nameInput().trim();

    this.nameSaving.set(true);
    this.nameError.set(null);
    this.profileService.updateName(name).subscribe({
      next: (user) => {
        this.nameSaving.set(false);
        this.authService.setCurrentUser(user);
        this.nameInput.set(user.name);
      },
      error: (error: HttpErrorResponse) => {
        this.nameSaving.set(false);
        this.nameError.set(error.error?.message ?? 'No se pudo cambiar el nombre');
      },
    });
  }

  readonly testBroadcastSending = signal(false);
  readonly testBroadcastResult = signal<string | null>(null);

  /** Boton "Probar notificaciones": manda un push real a todos los tokens registrados, para comprobar el pipeline entero de un vistazo. */
  sendTestBroadcast(): void {
    if (this.testBroadcastSending()) return;
    this.testBroadcastSending.set(true);
    this.testBroadcastResult.set(null);
    this.pushNotificationsService.sendTestBroadcast().subscribe({
      next: (result) => {
        this.testBroadcastSending.set(false);
        this.testBroadcastResult.set(
          `Enviado a ${result.successCount} de ${result.tokenCount} dispositivos (${result.userCount} usuarios en total).`,
        );
      },
      error: (error: HttpErrorResponse) => {
        this.testBroadcastSending.set(false);
        this.testBroadcastResult.set(error.error?.message ?? 'No se pudo enviar la notificación de prueba.');
      },
    });
  }

  logout(): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      data: {
        title: 'Cerrar sesión',
        message: 'Vas a cerrar sesión en este dispositivo. ¿Confirmas?',
        confirmLabel: 'Cerrar sesión',
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
    this.nameInput.set(this.authService.currentUser()?.name ?? '');
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
