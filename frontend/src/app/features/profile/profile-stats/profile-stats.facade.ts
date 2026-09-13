import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MemberProfileService } from '../../../core/services/member-profile.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { MemberProfile } from '../../../core/models/member-profile.model';
import { goBackOrFallback } from '../../../shared/utils/back-navigation';

/**
 * Vista "Estadísticas", compartida entre el perfil propio (`/profile/stats`,
 * sin parametros de ruta: grupo activo + usuario actual) y el perfil ajeno
 * (`/groups/:groupId/members/:userId/stats`) — misma pantalla, mismo dato
 * (MemberProfileService.getMemberProfile sirve el propio perfil dentro de un
 * grupo igual que el de cualquier otro miembro).
 */
@Injectable()
export class ProfileStatsFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly memberProfileService = inject(MemberProfileService);
  private readonly rankingsService = inject(RankingsService);
  private readonly groupsService = inject(GroupsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);

  private readonly routeGroupId = this.route.snapshot.paramMap.get('groupId');
  private readonly routeUserId = this.route.snapshot.paramMap.get('userId');
  private readonly currentUserId = this.authService.currentUser()?.id ?? null;

  readonly groupId = this.routeGroupId ?? this.activeGroupService.activeId();
  readonly userId = this.routeUserId ?? this.currentUserId;
  readonly viewingSelf = !this.routeUserId || this.routeUserId === this.currentUserId;

  /** Solo si se entra por un enlace directo, sin historial dentro de la app que recorrer (ver goBackOrFallback). */
  private readonly fallbackTarget = this.viewingSelf
    ? ['/profile']
    : ['/groups', this.routeGroupId!, 'members', this.routeUserId!];

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly profile = signal<MemberProfile | null>(null);
  readonly rankingRow = signal<{ position: number; points: number } | null>(null);

  readonly hitRatePercent = computed(() => {
    const rate = this.profile()?.hitRate;
    return rate === null || rate === undefined ? null : Math.round(rate * 100);
  });

  init(): void {
    const groupId = this.groupId;
    const userId = this.userId;
    if (!groupId || !userId) {
      this.error.set(true);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(false);
    this.groupsService.getById(groupId).subscribe({
      next: (group) => {
        const activeCompetitionIds = (group.groupCompetitions ?? [])
          .filter((gc) => gc.isActive)
          .map((gc) => gc.competitionId);
        /**
         * "general" (ranking combinado) solo existe como tal cuando el
         * grupo tiene mas de una competicion activa — con una sola, el
         * total real vive en el scope de esa competicion (ver
         * RankingsPageFacade.loadActiveCompetitions, mismo criterio).
         */
        const scope = activeCompetitionIds.length > 1 ? 'general' : (activeCompetitionIds[0] ?? 'general');

        forkJoin({
          profile: this.memberProfileService.getProfile(groupId, userId),
          ranking: this.rankingsService.getRanking(groupId, 'TOTAL', scope),
        }).subscribe({
          next: ({ profile, ranking }) => {
            this.profile.set(profile);
            const row = ranking.find((r) => r.userId === userId);
            this.rankingRow.set(row ? { position: row.position, points: row.points } : null);
            this.loading.set(false);
          },
          error: () => {
            this.error.set(true);
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  goBack(): void {
    goBackOrFallback(this.location, this.router, this.fallbackTarget);
  }
}
