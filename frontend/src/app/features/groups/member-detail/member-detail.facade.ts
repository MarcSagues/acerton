import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MemberProfileService } from '../../../core/services/member-profile.service';
import { MemberProfile, MemberBadge } from '../../../core/models/member-profile.model';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { badgeArtId } from '../../../shared/utils/badge-art';
import { TrophyDetailDialogComponent, TrophyDetailData } from '../../profile/trophy-detail-dialog.component';
import { BadgeDetailDialogComponent, BadgeDetailData } from '../../profile/badge-detail-dialog.component';
import { TROPHIES } from '../../profile/domain/trophies';

@Injectable()
export class MemberDetailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly memberProfileService = inject(MemberProfileService);
  private readonly dialog = inject(PiqoDialogService);

  readonly trophies = TROPHIES;

  readonly groupId = this.route.snapshot.paramMap.get('groupId')!;
  readonly userId = this.route.snapshot.paramMap.get('userId')!;

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly profile = signal<MemberProfile | null>(null);

  readonly hitRatePercent = computed(() => {
    const rate = this.profile()?.hitRate;
    return rate === null || rate === undefined ? null : Math.round(rate * 100);
  });

  readonly roleLabel = computed(() => {
    const p = this.profile();
    if (!p) return '';
    if (p.isOwner) return 'Propietario';
    return p.role === 'ADMIN' ? 'Administrador' : 'Miembro';
  });

  init(): void {
    this.loading.set(true);
    this.error.set(false);
    this.memberProfileService.getProfile(this.groupId, this.userId).subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  artId(code: string): string | null {
    return badgeArtId(code);
  }

  openTrophy(trophy: TrophyDetailData): void {
    this.dialog.open<TrophyDetailDialogComponent, void, TrophyDetailData>(TrophyDetailDialogComponent, {
      data: trophy,
    });
  }

  /** Solo insignias ya conseguidas (p.badges), no hay vista de pendientes en el perfil ajeno. */
  openBadge(userBadge: MemberBadge): void {
    this.dialog.open<BadgeDetailDialogComponent, void, BadgeDetailData>(BadgeDetailDialogComponent, {
      data: {
        artId: this.artId(userBadge.badge.code),
        name: userBadge.badge.name,
        description: userBadge.badge.description,
        earned: true,
        percentage: null,
        progress: null,
      },
    });
  }
}
