import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { AvatarMascotOption } from '../../../core/models/avatar-catalog.model';
import { mascotIdFromUrl } from '../domain/avatar-catalog.util';

@Injectable()
export class ProfileAvatarFacade {
  private readonly router = inject(Router);
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

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
  }

  selectMascot(mascotId: string): void {
    this.selectedMascotId.set(mascotId);
  }

  selectBackground(background: string): void {
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
