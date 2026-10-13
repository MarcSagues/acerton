import { Injectable, computed, inject, signal } from '@angular/core';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { FavoriteTeam } from '../../../core/models/favorite-team.model';
import { t } from '../../../core/i18n/translate';
import { filterTeams } from '../domain/favorite-team.util';

@Injectable()
export class ProfileFavoriteTeamFacade {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly teams = signal<FavoriteTeam[]>([]);
  readonly search = signal('');

  readonly current = computed(() => this.authService.currentUser()?.favoriteTeam ?? null);
  readonly visibleTeams = computed(() => filterTeams(this.teams(), this.search()));

  init(): void {
    this.profileService.getTeamCatalog().subscribe({
      next: ({ teams }) => {
        this.teams.set(teams);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(t('favoriteTeam.noCargado'));
        this.loading.set(false);
      },
    });
  }

  isSelected(team: FavoriteTeam): boolean {
    return this.current()?.name === team.name;
  }

  /** Elegir guarda al momento (la bandera de arriba se actualiza); `null` quita el favorito. */
  select(team: FavoriteTeam | null): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);
    this.profileService.updateFavoriteTeam(team?.name ?? null).subscribe({
      next: (user) => {
        this.authService.setCurrentUser(user);
        this.saving.set(false);
      },
      error: () => {
        this.saving.set(false);
        this.error.set(t('favoriteTeam.noGuardado'));
      },
    });
  }
}
