import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { PredictionsService } from '../../../core/services/predictions.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { StreaksService } from '../../../core/services/streaks.service';
import { ProfileService } from '../../../core/services/profile.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { Matchday } from '../../../core/models/matchday.model';
import { Prediction } from '../../../core/models/prediction.model';
import { UserBadge } from '../../../core/models/profile.model';

@Component({
  selector: 'app-matchday-results',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './matchday-results.component.html',
  styleUrl: './matchday-results.component.scss',
})
export class MatchdayResultsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly streaksService = inject(StreaksService);
  private readonly profileService = inject(ProfileService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);

  readonly matchdayId = this.route.snapshot.paramMap.get('matchdayId')!;

  readonly loading = signal(true);
  readonly locked = signal(false);
  readonly matchday = signal<Matchday | null>(null);
  readonly myPredictions = signal<Prediction[]>([]);
  readonly position = signal<{ pos: number; total: number } | null>(null);
  readonly currentStreak = signal(0);
  readonly newBadges = signal<UserBadge[]>([]);

  readonly totalPoints = computed(() => this.myPredictions().reduce((sum, p) => sum + (p.pointsEarned ?? 0), 0));
  readonly hits = computed(() => this.myPredictions().filter((p) => (p.pointsEarned ?? 0) > 0).length);
  readonly rescueHits = computed(
    () => this.myPredictions().filter((p) => p.doubleChanceOption && (p.pointsEarned ?? 0) > 0).length,
  );

  ngOnInit(): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId) {
      this.loading.set(false);
      return;
    }

    this.matchdaysService.getById(this.matchdayId).subscribe((matchday) => {
      this.matchday.set(matchday);

      if (matchday.status !== 'CLOSED' && matchday.status !== 'FINISHED') {
        this.locked.set(true);
        this.loading.set(false);
        return;
      }

      const userId = this.authService.currentUser()?.id;

      forkJoin({
        predictions: this.predictionsService.getGroupPredictionsForMatchday(groupId, this.matchdayId),
        ranking: this.rankingsService.getRankingForMatchday(
          groupId,
          'WEEKLY',
          matchday.competitionId,
          this.matchdayId,
        ),
        streak: this.streaksService.getForUserInGroup(groupId),
        profile: this.profileService.getMyProfile(),
      }).subscribe(({ predictions, ranking, streak, profile }) => {
        this.myPredictions.set(predictions.filter((p) => p.userId === userId));

        const myRow = ranking.find((r) => r.userId === userId);
        if (myRow) {
          this.position.set({ pos: myRow.position, total: ranking.length });
        }

        this.currentStreak.set(streak.currentStreak);
        this.newBadges.set(profile.badges.filter((b) => b.matchdayId === this.matchdayId));

        this.loading.set(false);
      });
    });
  }

  choiceLabel(choice: string): string {
    return choice === 'HOME' ? '1' : choice === 'AWAY' ? '2' : 'X';
  }

  pickLabel(prediction: Prediction): string {
    if (prediction.doubleChanceOption) {
      return { HOME_OR_DRAW: '1X', DRAW_OR_AWAY: 'X2', HOME_OR_AWAY: '12' }[prediction.doubleChanceOption];
    }
    return prediction.choice ? this.choiceLabel(prediction.choice) : '?';
  }

  matchLabel(prediction: Prediction, matchday: Matchday): string {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match ? `${match.homeTeam} - ${match.awayTeam}` : '';
  }

  scoreLabel(prediction: Prediction, matchday: Matchday): string {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match ? `${match.homeScore} - ${match.awayScore}` : '';
  }

  realLabel(prediction: Prediction, matchday: Matchday): string {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match?.result ? this.choiceLabel(match.result) : '?';
  }
}
