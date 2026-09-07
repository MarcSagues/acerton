import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProfileService } from '../../../core/services/profile.service';
import { BadgesService } from '../../../core/services/badges.service';
import { AuthService } from '../../../core/services/auth.service';
import { PushNotificationsService } from '../../../core/services/push-notifications.service';
import { UserProfile } from '../../../core/models/profile.model';
import { Badge } from '../../../core/models/profile.model';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-page.component.html',
  styleUrl: './profile-page.component.scss',
})
export class ProfilePageComponent implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly badgesService = inject(BadgesService);
  readonly authService = inject(AuthService);
  readonly pushNotifications = inject(PushNotificationsService);

  readonly loading = signal(true);
  readonly profile = signal<UserProfile | null>(null);
  readonly catalog = signal<Badge[]>([]);

  readonly bestCurrentStreak = computed(() =>
    Math.max(0, ...(this.profile()?.groups.map((g) => g.streak.currentStreak) ?? [0])),
  );
  readonly bestLongestStreak = computed(() =>
    Math.max(0, ...(this.profile()?.groups.map((g) => g.streak.longestStreak) ?? [0])),
  );
  readonly totalComebackAllowance = computed(() =>
    (this.profile()?.groups ?? []).reduce((sum, g) => sum + g.comeback.allowance, 0),
  );
  readonly anyEligibleForComeback = computed(() =>
    (this.profile()?.groups ?? []).some((g) => g.comeback.enabled && g.comeback.allowance > 0),
  );

  readonly badgeStates = computed(() => {
    const earnedCodes = new Set((this.profile()?.badges ?? []).map((b) => b.badge.code));
    return this.catalog().map((badge) => ({ badge, earned: earnedCodes.has(badge.code) }));
  });

  enablePushNotifications(): void {
    this.pushNotifications.enable();
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  ngOnInit(): void {
    this.profileService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.badgesService.getCatalog().subscribe((catalog) => this.catalog.set(catalog));
  }
}
