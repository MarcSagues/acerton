import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MemberProfileService } from '../../../core/services/member-profile.service';
import { MemberProfile } from '../../../core/models/member-profile.model';

@Injectable()
export class MemberDetailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly memberProfileService = inject(MemberProfileService);

  readonly groupId = this.route.snapshot.paramMap.get('groupId')!;
  readonly userId = this.route.snapshot.paramMap.get('userId')!;

  readonly loading = signal(true);
  readonly profile = signal<MemberProfile | null>(null);

  readonly hitRatePercent = computed(() => {
    const rate = this.profile()?.hitRate;
    return rate === null || rate === undefined ? null : Math.round(rate * 100);
  });

  init(): void {
    this.memberProfileService.getProfile(this.groupId, this.userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  openMatchday(matchdayId: string): void {
    this.router.navigate(['/matchday', matchdayId, 'results', this.userId]);
  }
}
