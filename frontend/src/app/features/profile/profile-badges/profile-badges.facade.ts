import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile.service';
import { BadgesService } from '../../../core/services/badges.service';
import { Badge, UserProfile } from '../../../core/models/profile.model';
import { badgeArtId } from '../../../shared/utils/badge-art';

export interface BadgeState {
  badge: Badge;
  earned: boolean;
  percentage: number | null;
}

@Injectable()
export class ProfileBadgesFacade {
  private readonly profileService = inject(ProfileService);
  private readonly badgesService = inject(BadgesService);
  private readonly router = inject(Router);

  readonly loading = signal(true);
  private readonly profile = signal<UserProfile | null>(null);
  private readonly catalog = signal<Badge[]>([]);
  private readonly stats = signal<Record<string, number>>({});

  readonly badgeStates = computed<BadgeState[]>(() => {
    const earnedCodes = new Set((this.profile()?.badges ?? []).map((b) => b.badge.code));
    const stats = this.stats();
    return this.catalog().map((badge) => ({
      badge,
      earned: earnedCodes.has(badge.code),
      percentage: stats[badge.code] ?? null,
    }));
  });
  readonly earnedCount = computed(() => this.profile()?.badges.length ?? 0);
  readonly totalCount = computed(() => this.catalog().length);

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  artId(code: string): string | null {
    return badgeArtId(code);
  }

  init(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.badgesService.getCatalog().subscribe((catalog) => this.catalog.set(catalog));
    this.badgesService.getStats().subscribe((stats) => this.stats.set(stats));
  }
}
