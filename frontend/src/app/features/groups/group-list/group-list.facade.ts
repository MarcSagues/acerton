import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { ProfileService } from '../../../core/services/profile.service';
import { initials } from '../../../shared/utils/initials';

@Injectable()
export class GroupListFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly profileService = inject(ProfileService);
  private readonly router = inject(Router);

  readonly groups = this.groupsService.myGroups;
  readonly activeGroupId = this.activeGroupService.activeId;
  readonly loading = signal(true);
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

  initials(name: string): string {
    return initials(name);
  }

  goToGroup(groupId: string): void {
    this.activeGroupService.setActive(groupId);
    this.router.navigate(['/rankings']);
  }

  goToSettings(groupId: string): void {
    this.router.navigate(['/groups', groupId, 'settings']);
  }

  goToCreate(): void {
    this.router.navigate(['/groups/create']);
  }

  goToJoinCode(): void {
    this.router.navigate(['/groups/join-code']);
  }
}
