import { Injectable, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MemberProfileService } from '../../../core/services/member-profile.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { MemberProfile } from '../../../core/models/member-profile.model';
import { MatchdayStatus } from '../../../core/models/matchday.model';
import { goBackOrFallback } from '../../../shared/utils/back-navigation';

const STATUS_LABEL: Record<MatchdayStatus, string> = {
  SCHEDULED: 'Programada',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
  FINISHED: 'Finalizada',
};

/**
 * Vista "Histórico", compartida entre el perfil propio (`/profile/history`)
 * y el ajeno (`/groups/:groupId/members/:userId/history`) — mismo dato que
 * "Estadísticas" (MemberProfileService.getMemberProfile), solo cambia que
 * aqui interesa el listado de jornadas en vez de los totales.
 */
@Injectable()
export class ProfileHistoryFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly memberProfileService = inject(MemberProfileService);
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
    this.memberProfileService.getProfile(groupId, userId).subscribe({
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

  statusLabel(status: MatchdayStatus): string {
    return STATUS_LABEL[status];
  }

  goBack(): void {
    goBackOrFallback(this.location, this.router, this.fallbackTarget);
  }

  openMatchday(matchdayId: string): void {
    const groupId = this.groupId;
    const userId = this.userId;
    if (!groupId || !userId) return;
    const path = this.viewingSelf ? ['/matchday', matchdayId, 'results'] : ['/matchday', matchdayId, 'results', userId];
    this.router.navigate(path, { queryParams: this.viewingSelf ? undefined : { groupId } });
  }
}
