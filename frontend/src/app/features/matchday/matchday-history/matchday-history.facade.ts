import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompetitionHistory } from '../../../core/models/ranking.model';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { RankingsService } from '../../../core/services/rankings.service';

@Injectable()
export class MatchdayHistoryFacade {
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

  init(): void {
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
