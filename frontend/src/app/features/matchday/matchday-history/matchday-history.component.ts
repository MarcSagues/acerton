import { Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RankingsService } from '../../../core/services/rankings.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { CompetitionHistory } from '../../../core/models/ranking.model';

@Component({
  selector: 'app-matchday-history',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, DecimalPipe],
  templateUrl: './matchday-history.component.html',
  styleUrl: './matchday-history.component.scss',
})
export class MatchdayHistoryComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly rankingsService = inject(RankingsService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);

  readonly competitionId = this.route.snapshot.queryParamMap.get('competitionId')!;
  readonly competitionName = this.route.snapshot.queryParamMap.get('competitionName') ?? '';
  readonly currentUserId = this.authService.currentUser()?.id ?? null;

  readonly loading = signal(true);
  readonly history = signal<CompetitionHistory | null>(null);

  ngOnInit(): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId || !this.competitionId) {
      this.loading.set(false);
      return;
    }
    this.rankingsService.getHistory(groupId, this.competitionId).subscribe({
      next: (history) => {
        this.history.set(history);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  isMine(userId: string): boolean {
    return userId === this.currentUserId;
  }

  openMatchday(matchdayId: string): void {
    this.router.navigate(['/matchday', matchdayId, 'results']);
  }
}
