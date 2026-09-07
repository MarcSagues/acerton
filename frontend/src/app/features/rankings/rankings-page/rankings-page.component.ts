import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupsService } from '../../../core/services/groups.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { AuthService } from '../../../core/services/auth.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { Group } from '../../../core/models/group.model';
import { RankingPeriod, RankingRow } from '../../../core/models/ranking.model';

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, GroupSwitcherComponent],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.scss',
})
export class RankingsPageComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly authService = inject(AuthService);
  readonly activeGroupService = inject(ActiveGroupService);

  readonly loading = signal(true);
  readonly loadingRanking = signal(false);
  readonly groupDetail = signal<Group | null>(null);
  readonly period = signal<RankingPeriod>('TOTAL');
  readonly scope = signal<string>('general');
  readonly rows = signal<RankingRow[]>([]);
  readonly currentUserId = this.authService.currentUser()?.id;

  readonly activeCompetitions = computed(
    () => (this.groupDetail()?.groupCompetitions ?? []).filter((gc) => gc.isActive).map((gc) => gc.competition),
  );
  readonly hasMultipleCompetitions = computed(() => this.activeCompetitions().length > 1);
  readonly myRow = computed(() => this.rows().find((r) => r.userId === this.currentUserId) ?? null);

  constructor() {
    effect(
      () => {
        const groupId = this.activeGroupService.activeId();
        if (groupId) {
          this.loadGroup(groupId);
        }
      },
      { allowSignalWrites: true },
    );
  }

  private loadGroup(groupId: string): void {
    this.loading.set(true);
    this.groupsService.getById(groupId).subscribe((group) => {
      this.groupDetail.set(group);
      const active = (group.groupCompetitions ?? []).filter((gc) => gc.isActive);
      this.scope.set(active.length > 1 ? 'general' : (active[0]?.competitionId ?? 'general'));
      this.loading.set(false);
      this.fetchRanking(groupId);
    });
  }

  setPeriod(period: RankingPeriod): void {
    this.period.set(period);
    const groupId = this.activeGroupService.activeId();
    if (groupId) this.fetchRanking(groupId);
  }

  setScope(scope: string): void {
    this.scope.set(scope);
    // La clasificacion semanal general no existe (cada competicion tiene su
    // propio calendario de jornadas), asi que al elegir "general" se fuerza
    // a "Total" en vez de dejar una combinacion sin sentido seleccionada.
    if (scope === 'general' && this.period() === 'WEEKLY') {
      this.period.set('TOTAL');
    }
    const groupId = this.activeGroupService.activeId();
    if (groupId) this.fetchRanking(groupId);
  }

  /** "+2"/"-1"/"=" para el indicador de posicion ganada/perdida respecto a la jornada anterior. */
  deltaLabel(delta: number): string {
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return '=';
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  private fetchRanking(groupId: string): void {
    this.loadingRanking.set(true);
    this.rankingsService.getRanking(groupId, this.period(), this.scope()).subscribe({
      next: (rows) => {
        this.rows.set(rows);
        this.loadingRanking.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loadingRanking.set(false);
      },
    });
  }
}
