import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { MatchdaySummary } from '../../../core/models/matchday.model';

type CellState = 'played' | 'open' | 'upcoming';

@Component({
  selector: 'app-matchday-calendar',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  templateUrl: './matchday-calendar.component.html',
  styleUrl: './matchday-calendar.component.scss',
})
export class MatchdayCalendarComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly activeGroupService = inject(ActiveGroupService);

  readonly competitionId = this.route.snapshot.queryParamMap.get('competitionId')!;
  readonly competitionName = this.route.snapshot.queryParamMap.get('competitionName') ?? '';

  readonly loading = signal(true);
  readonly matchdays = signal<MatchdaySummary[]>([]);

  /** La "actual": la de menor orden que no ha terminado, o la ultima si ya estan todas FINISHED. */
  readonly currentMatchdayId = computed(() => {
    const list = this.matchdays();
    return list.find((m) => m.status !== 'FINISHED')?.id ?? list.at(-1)?.id ?? null;
  });

  ngOnInit(): void {
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

  state(matchday: MatchdaySummary): CellState {
    if (matchday.points !== null) return 'played';
    if (matchday.id === this.currentMatchdayId()) return 'open';
    return 'upcoming';
  }

  open(matchday: MatchdaySummary): void {
    const state = this.state(matchday);
    if (state === 'played') {
      this.router.navigate(['/matchday', matchday.id, 'results']);
    } else if (state === 'open') {
      this.router.navigate(['/matchday']);
    }
  }
}
