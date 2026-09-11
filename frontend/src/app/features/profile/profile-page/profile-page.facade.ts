import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { PushNotificationsService } from '../../../core/services/push-notifications.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { UserProfile } from '../../../core/models/profile.model';
import { usernameHint, validateUsername } from '../../../shared/username.util';
import { initials } from '../../../shared/utils/initials';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { TrophyDetailDialogComponent, TrophyDetailData } from '../trophy-detail-dialog.component';

/**
 * Vitrina de trofeos (HANDOFF §13/§18): 7 disenos fijos del kit. Piqo aun
 * no tiene un modelo de datos real para trofeos ("Para Copa Piqo falta
 * fijar el criterio"), asi que se muestran todos honestamente como no
 * conseguidos en vez de inventar datos de competiciones ganadas.
 */
const TROPHIES: TrophyDetailData[] = [
  { id: 'piqo', name: 'Copa Piqo' },
  { id: 'champions', name: 'Champions League' },
  { id: 'laliga', name: 'LaLiga' },
  { id: 'bundesliga', name: 'Bundesliga' },
  { id: 'ligue1', name: 'Ligue 1' },
  { id: 'europa', name: 'Europa League' },
  { id: 'seriea', name: 'Serie A' },
];

@Injectable()
export class ProfilePageFacade {
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);
  private readonly dialog = inject(PiqoDialogService);
  readonly authService = inject(AuthService);
  readonly pushNotifications = inject(PushNotificationsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly tutorialService = inject(TutorialService);

  readonly loading = signal(true);
  readonly profile = signal<UserProfile | null>(null);

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

  enablePushNotifications(): void {
    this.pushNotifications.enable();
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

  logout(): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(ConfirmDialogComponent, {
      data: {
        title: 'Cerrar sesion',
        message: 'Vas a cerrar sesion en este dispositivo. ¿Confirmas?',
        confirmLabel: 'Cerrar sesion',
      },
    });

    dialogRef.closed.subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.authService.logout().subscribe(() => this.router.navigate(['/login']));
    });
  }

  initials(name: string): string {
    return initials(name);
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
  }
}
