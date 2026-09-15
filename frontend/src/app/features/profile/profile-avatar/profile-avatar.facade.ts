import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationsFeedService } from '../../../core/services/notifications-feed.service';
import { AvatarMascotOption } from '../../../core/models/avatar-catalog.model';
import { mascotIdFromUrl } from '../domain/avatar-catalog.util';
import { TROPHIES } from '../domain/trophies';
import { levelRequiredForBackground, levelRequiredForMascot } from '../level-progress/level-progress.domain';

@Injectable()
export class ProfileAvatarFacade {
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);
  private readonly notificationsFeed = inject(NotificationsFeedService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly mascots = signal<AvatarMascotOption[]>([]);
  readonly backgrounds = signal<string[]>([]);

  private readonly currentUser = this.authService.currentUser;

  readonly selectedMascotId = signal<string | null>(null);
  readonly selectedBackground = signal<string | null>(null);

  readonly hasChanges = computed(() => {
    const user = this.currentUser();
    const currentMascotId = mascotIdFromUrl(user?.avatarUrl ?? null);
    return (
      this.selectedMascotId() !== null &&
      this.selectedBackground() !== null &&
      (this.selectedMascotId() !== currentMascotId || this.selectedBackground() !== user?.avatarBackground)
    );
  });

  init(): void {
    const user = this.currentUser();
    this.selectedMascotId.set(mascotIdFromUrl(user?.avatarUrl ?? null));
    this.selectedBackground.set(user?.avatarBackground ?? null);

    this.profileService.getAvatarCatalog().subscribe({
      next: (catalog) => {
        this.mascots.set(catalog.mascots);
        this.backgrounds.set(catalog.backgrounds);
        if (!this.selectedBackground() && catalog.backgrounds.length > 0) {
          this.selectedBackground.set(catalog.backgrounds[0]);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.notificationsFeed.refresh();
  }

  /**
   * Las mascotas de trofeo solo se pueden elegir con el trofeo
   * correspondiente conseguido. Ver el aviso en avatar-catalog.ts
   * (backend): "conseguido" hoy es el mismo catalogo de muestra que ya se
   * ve en la Vitrina de Perfil (recuento fijo, igual para todos), no un
   * dato real por usuario todavia. Las mascotas normales, en cambio, son
   * recompensas de nivel reales (Sprint 14) — el nivel ya viaja en
   * `AuthService.currentUser()`, mismo dato que valida el backend en
   * `UsersService.updateAvatar`.
   */
  isMascotLocked(mascot: AvatarMascotOption): boolean {
    if (mascot.requiresTrophyId) {
      const trophy = TROPHIES.find((t) => t.id === mascot.requiresTrophyId);
      return !trophy || trophy.count <= 0;
    }
    return (this.currentUser()?.level ?? 1) < levelRequiredForMascot(mascot.id);
  }

  requiredLevelForMascot(mascot: AvatarMascotOption): number {
    return levelRequiredForMascot(mascot.id);
  }

  isBackgroundLocked(background: string): boolean {
    return (this.currentUser()?.level ?? 1) < levelRequiredForBackground(background);
  }

  requiredLevelForBackground(background: string): number {
    return levelRequiredForBackground(background);
  }

  /** Niveles con un aviso de "subiste de nivel" sin leer (mismo dato que ya usa el recorrido en /profile/level, ver level-progress.facade.ts). */
  private readonly unclaimedLevels = computed(
    () => new Set(this.notificationsFeed.unreadLevelUps().map((n) => n.level)),
  );

  /** Puntito rojo en el elemento concreto que se acaba de desbloquear (mismo patron que Jornada): ya desbloqueado pero su nivel sigue con el aviso de subida de nivel sin leer/reclamar. */
  isMascotNew(mascot: AvatarMascotOption): boolean {
    return !this.isMascotLocked(mascot) && this.unclaimedLevels().has(levelRequiredForMascot(mascot.id));
  }

  isBackgroundNew(background: string): boolean {
    return !this.isBackgroundLocked(background) && this.unclaimedLevels().has(levelRequiredForBackground(background));
  }

  selectMascot(mascot: AvatarMascotOption): void {
    if (this.isMascotLocked(mascot)) return;
    this.selectedMascotId.set(mascot.id);
  }

  selectBackground(background: string): void {
    if (this.isBackgroundLocked(background)) return;
    this.selectedBackground.set(background);
  }

  save(): void {
    const mascotId = this.selectedMascotId();
    const background = this.selectedBackground();
    if (!mascotId || !background || this.saving()) return;

    this.saving.set(true);
    this.error.set(null);
    this.profileService.updateAvatar(mascotId, background).subscribe({
      next: (user) => {
        this.authService.setCurrentUser(user);
        this.saving.set(false);
        this.router.navigate(['/profile']);
      },
      error: () => {
        this.saving.set(false);
        this.error.set('No se pudo guardar el avatar. Inténtalo de nuevo.');
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
