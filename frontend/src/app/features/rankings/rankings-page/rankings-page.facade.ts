import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { GroupsService } from '../../../core/services/groups.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { AuthService } from '../../../core/services/auth.service';
import { TutorialService } from '../../../core/services/tutorial.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { SeasonsService } from '../../../core/services/seasons.service';
import { Group } from '../../../core/models/group.model';
import { RankingPeriod, RankingRow } from '../../../core/models/ranking.model';

export interface EvolutionBar {
  label: string;
  points: number;
  /** 0-100, para la altura de la barra. */
  heightPct: number;
}

@Injectable()
export class RankingsPageFacade {
  private readonly groupsService = inject(GroupsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly authService = inject(AuthService);
  private readonly tutorialService = inject(TutorialService);
  private readonly seasonsService = inject(SeasonsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
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
  readonly evolutionMatchdays = signal<{ order: number; myPoints: number | null }[]>([]);
  readonly currentUserId = this.authService.currentUser()?.id;
  /** Etiqueta de la temporada abierta del grupo ("2026/27"), o null si todavia no se ha puntuado ninguna jornada. */
  readonly currentSeasonLabel = signal<string | null>(null);

  readonly activeCompetitions = computed(
    () => (this.groupDetail()?.groupCompetitions ?? []).filter((gc) => gc.isActive).map((gc) => gc.competition),
  );
  readonly hasMultipleCompetitions = computed(() => this.activeCompetitions().length > 1);
  readonly myRow = computed(() => this.rows().find((r) => r.userId === this.currentUserId) ?? null);
  /** Solo tiene sentido por competicion: cada una tiene su propio calendario de jornadas, no hay "jornada combinada" en la vista general. */
  readonly showEvolution = computed(() => this.period() === 'TOTAL' && this.scope() !== 'general');
  readonly evolutionBars = computed<EvolutionBar[]>(() => {
    const recent = this.evolutionMatchdays().slice(0, 6).reverse();
    const max = Math.max(1, ...recent.map((m) => m.myPoints ?? 0));
    return recent.map((m) => ({
      label: `J${m.order}`,
      points: m.myPoints ?? 0,
      heightPct: m.myPoints === null ? 0 : Math.max(6, Math.round((m.myPoints / max) * 100)),
    }));
  });

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
      this.seasonsService.listSeasons(groupId).subscribe({
        next: (seasons) => this.currentSeasonLabel.set(seasons.find((s) => !s.endedAt)?.label ?? null),
        error: () => this.currentSeasonLabel.set(null),
      });

      if (!this.tutorialHandledThisSession && !this.tutorialService.hasSeenTutorial()) {
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

  /** "+2"/"-1" para el indicador de posicion ganada/perdida respecto a la jornada anterior; null si no ha cambiado (no se muestra nada). */
  deltaLabel(delta: number): string | null {
    if (delta > 0) return `+${delta}`;
    if (delta < 0) return `${delta}`;
    return null;
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
          this.toast.show('Todavía no hay jornadas cerradas para ver quinielas');
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
        this.toast.show('No se pudo cargar la jornada');
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

    if (this.showEvolution()) {
      this.rankingsService.getHistory(groupId, this.scope()).subscribe({
        next: (history) => this.evolutionMatchdays.set(history.matchdays),
        error: () => this.evolutionMatchdays.set([]),
      });
    } else {
      this.evolutionMatchdays.set([]);
    }
  }
}
