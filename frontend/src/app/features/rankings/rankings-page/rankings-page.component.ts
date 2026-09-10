import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupsService } from '../../../core/services/groups.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { AuthService } from '../../../core/services/auth.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { Group } from '../../../core/models/group.model';
import { RankingPeriod, RankingRow } from '../../../core/models/ranking.model';

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, GroupSwitcherComponent, MatProgressSpinnerModule],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.scss',
})
export class RankingsPageComponent {
  private readonly groupsService = inject(GroupsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly authService = inject(AuthService);
  private readonly tutorialService = inject(TutorialService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  readonly activeGroupService = inject(ActiveGroupService);

  /** Se inicia al entrar por primera vez en un grupo (Tabla es donde se aterriza al elegirlo). */
  private tutorialHandledThisSession = false;

  readonly loading = signal(true);
  readonly loadingRanking = signal(false);
  readonly resolvingUserId = signal<string | null>(null);
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

      if (!this.tutorialHandledThisSession && !this.authService.currentUser()?.tutorialCompleted) {
        this.tutorialHandledThisSession = true;
        this.tutorialService.start(group.scoringMode);
      }
    });
  }

  setPeriod(period: RankingPeriod): void {
    this.period.set(period);
    // La clasificacion semanal general no existe (cada competicion tiene su
    // propio calendario de jornadas): al elegir "Semanal" estando en
    // "General" se cambia a la primera competicion activa en vez de dejar
    // una combinacion sin sentido seleccionada.
    if (period === 'WEEKLY' && this.scope() === 'general') {
      this.scope.set(this.activeCompetitions()[0]?.id ?? 'general');
    }
    const groupId = this.activeGroupService.activeId();
    if (groupId) this.fetchRanking(groupId);
  }

  setScope(scope: string): void {
    this.scope.set(scope);
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

  /**
   * Abre las quinielas de un jugador para la jornada cerrada mas reciente de
   * la competicion seleccionada (o de la primera activa si la vista es
   * "general"). Si la jornada "en vivo" de esa competicion todavia esta
   * abierta, retrocede a la anterior — nunca se navega a una jornada sin
   * cerrar (el backend lo rechazaria igualmente, ver getGroupPredictionsForMatchday).
   */
  viewUserPicks(userId: string): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId || this.resolvingUserId()) return;

    const scope = this.scope();
    const competitionId = scope !== 'general' ? scope : this.activeCompetitions()[0]?.id;
    if (!competitionId) return;

    this.resolvingUserId.set(userId);
    this.matchdaysService.getLatestLockedMatchday(groupId, competitionId).subscribe({
      next: (matchday) => {
        this.resolvingUserId.set(null);
        if (!matchday) {
          this.snackBar.open('Todavia no hay jornadas cerradas para ver quinielas', 'Cerrar', { duration: 2500 });
          return;
        }
        const path =
          userId === this.currentUserId
            ? ['/matchday', matchday.id, 'results']
            : ['/matchday', matchday.id, 'results', userId];
        this.router.navigate(path);
      },
      error: () => {
        this.resolvingUserId.set(null);
        this.snackBar.open('No se pudo cargar la jornada', 'Cerrar', { duration: 3000 });
      },
    });
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
