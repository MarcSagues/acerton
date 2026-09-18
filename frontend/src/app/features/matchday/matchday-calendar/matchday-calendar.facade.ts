import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatchdaySummary } from '../../../core/models/matchday.model';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import {
  MatchdayCellState,
  currentMatchdayId,
  matchdayCellState,
} from '../domain/matchday-calendar.rules';

@Injectable()
export class MatchdayCalendarFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly competitionId = this.route.snapshot.queryParamMap.get('competitionId')!;
  readonly competitionName = this.route.snapshot.queryParamMap.get('competitionName') ?? '';
  /** Se llego aqui desde la pantalla de resultados (ver goToCalendar en MatchdayResultsFacade): la jornada abierta tambien debe llevar a resultados, no al formulario de pronosticos. */
  private readonly fromResults = this.route.snapshot.queryParamMap.get('from') === 'results';
  readonly loading = signal(true);
  readonly matchdays = signal<MatchdaySummary[]>([]);
  readonly currentMatchdayId = computed(() => currentMatchdayId(this.matchdays()));

  init(): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId || !this.competitionId) {
      this.loading.set(false);
      return;
    }
    this.matchdaysService.listForCompetition(groupId, this.competitionId).subscribe({
      next: (matchdays) => {
        this.matchdays.set(matchdays);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  state(matchday: MatchdaySummary): MatchdayCellState {
    return matchdayCellState(matchday, this.currentMatchdayId());
  }

  open(matchday: MatchdaySummary): void {
    const state = this.state(matchday);
    if (state === 'played' || (state === 'open' && this.fromResults)) {
      this.router.navigate(['/matchday', matchday.id, 'results']);
    } else if (state === 'open') {
      this.router.navigate(['/matchday']);
    }
  }
}
