import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { Group, ScoringMode } from '../../../core/models/group.model';
import { scoringModeIcon as scoringModeIconOf } from '../../../shared/utils/scoring-mode-badge';

@Injectable()
export class GroupListFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly profileService = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly groups = this.groupsService.myGroups;
  readonly activeGroupId = this.activeGroupService.activeId;
  readonly loading = signal(true);
  /**
   * /welcome vive fuera del shell (sin barra superior con logo): el estado
   * vacio reserva ahi ese hueco a mano. /groups (mismo componente, dentro
   * del shell) ya tiene su propia barra superior real — repetir el hueco
   * duplicaria el espacio por encima del icono.
   */
  readonly isStandaloneWelcome = this.router.url.startsWith('/welcome');
  /** Racha actual por grupo (jornadas seguidas participando), para el chip de fuego en la tarjeta. */
  private readonly groupStreaks = signal<Record<string, number>>({});

  init(): void {
    this.groupsService.loadMyGroups().subscribe({
      next: (groups) => {
        this.activeGroupService.setGroups(groups);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.profileService.getMyProfile().subscribe((profile) => {
      const byGroup: Record<string, number> = {};
      for (const summary of profile.groups) {
        byGroup[summary.group.id] = summary.streak.currentStreak;
      }
      this.groupStreaks.set(byGroup);
    });
  }

  streakFor(groupId: string): number | null {
    const streak = this.groupStreaks()[groupId];
    return streak > 0 ? streak : null;
  }

  goToExplorePublic(): void {
    this.router.navigate(['/groups/public']);
  }

  scoringModeIcon(mode: ScoringMode): string {
    return scoringModeIconOf(mode);
  }

  goToGroup(groupId: string): void {
    this.activeGroupService.setActive(groupId);
    this.router.navigate(['/rankings']);
  }

  goToSettings(groupId: string): void {
    this.router.navigate(['/groups', groupId, 'settings']);
  }

  /**
   * Fija/quita este grupo de favoritos, para ti. Actualiza tambien el
   * selector de grupo (ActiveGroupService) para que quede pinchado arriba
   * ahi tambien sin esperar a la proxima carga completa.
   */
  toggleFavorite(group: Group): void {
    const next = !group.isFavorite;
    this.groupsService.setFavorite(group.id, next).subscribe({
      next: () => this.activeGroupService.setGroups(this.groupsService.myGroups()),
      error: () => this.toast.show('No se pudo actualizar el favorito. Inténtalo de nuevo.'),
    });
  }

  goToCreate(): void {
    this.router.navigate(['/groups/create']);
  }

  goToJoinCode(): void {
    this.router.navigate(['/groups/join-code']);
  }
}
