import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  private readonly router = inject(Router);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly streaksService = inject(StreaksService);
  private readonly profileService = inject(ProfileService);
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  /** Si viene en la ruta, estamos viendo las quinielas de otro miembro del grupo en vez de las propias. */
  private readonly routeUserId = this.route.snapshot.paramMap.get('userId');
  private readonly currentUserId = this.authService.currentUser()?.id ?? null;
  readonly viewingSelf = !this.routeUserId || this.routeUserId === this.currentUserId;

  readonly loading = signal(true);
  readonly navigating = signal(false);
  readonly locked = signal(false);
  readonly matchday = signal<Matchday | null>(null);
  readonly predictions = signal<Prediction[]>([]);
  readonly targetUserName = signal<string | null>(null);
  readonly position = signal<{ pos: number; total: number } | null>(null);
  readonly currentStreak = signal(0);
  readonly newBadges = signal<UserBadge[]>([]);
  /** Se pone a true cuando "siguiente"/"anterior" ya devolvio null o una jornada aun no cerrada. */
  readonly noNextAvailable = signal(false);
  readonly noPreviousAvailable = signal(false);

  readonly totalPoints = computed(() => this.predictions().reduce((sum, p) => sum + (p.pointsEarned ?? 0), 0));
  readonly hits = computed(() => this.predictions().filter((p) => (p.pointsEarned ?? 0) > 0).length);
  readonly rescueHits = computed(
    () => this.predictions().filter((p) => p.doubleChanceOption && (p.pointsEarned ?? 0) > 0).length,
  );

  ngOnInit(): void {
    const matchdayId = this.route.snapshot.paramMap.get('matchdayId')!;
    this.loadMatchday(matchdayId);
  }

  navigatePrevious(): void {
    this.navigate('previous');
  }

  navigateNext(): void {
    this.navigate('next');
  }

  private navigate(direction: 'previous' | 'next'): void {
    const current = this.matchday();
    if (!current || this.navigating()) return;

    this.navigating.set(true);
    this.matchdaysService.getAdjacent(current.id, direction).subscribe({
      next: (next) => {
        this.navigating.set(false);
        if (!next || (next.status !== 'CLOSED' && next.status !== 'FINISHED')) {
          if (direction === 'next') {
            this.noNextAvailable.set(true);
          } else {
            this.noPreviousAvailable.set(true);
          }
          this.snackBar.open(
            direction === 'previous' ? 'No hay jornada anterior cerrada' : 'La siguiente jornada todavia no ha cerrado',
            'Cerrar',
            { duration: 2500 },
          );
          return;
        }
        this.noNextAvailable.set(false);
        this.noPreviousAvailable.set(false);
        // Mantiene la URL sincronizada (compartible / recargable) sin recrear el componente.
        const path = this.viewingSelf
          ? ['/matchday', next.id, 'results']
          : ['/matchday', next.id, 'results', this.routeUserId!];
        this.router.navigate(path, { replaceUrl: true });
        this.loadMatchday(next.id);
      },
      error: () => {
        this.navigating.set(false);
        this.snackBar.open('No se pudo cargar la jornada', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private loadMatchday(matchdayId: string): void {
    this.loading.set(true);
    const groupId = this.activeGroupService.activeId();
    if (!groupId) {
      this.loading.set(false);
      return;
    }

    this.matchdaysService.getById(matchdayId).subscribe((matchday) => {
      this.matchday.set(matchday);

      if (matchday.status !== 'CLOSED' && matchday.status !== 'FINISHED') {
        this.locked.set(true);
        this.loading.set(false);
        return;
      }
      this.locked.set(false);

      const targetUserId = this.routeUserId ?? this.currentUserId;

      forkJoin({
        predictions: this.predictionsService.getGroupPredictionsForMatchday(groupId, matchdayId),
        ranking: this.rankingsService.getRankingForMatchday(groupId, 'WEEKLY', matchday.competitionId, matchdayId),
        streak: this.viewingSelf ? this.streaksService.getForUserInGroup(groupId) : of(null),
        profile: this.viewingSelf ? this.profileService.getMyProfile() : of(null),
      }).subscribe(({ predictions, ranking, streak, profile }) => {
        const targetPredictions = predictions.filter((p) => p.userId === targetUserId);
        this.predictions.set(targetPredictions);
        this.targetUserName.set(targetPredictions[0]?.user?.name ?? null);

        const targetRow = ranking.find((r) => r.userId === targetUserId);
        this.position.set(targetRow ? { pos: targetRow.position, total: ranking.length } : null);

        if (streak) {
          this.currentStreak.set(streak.currentStreak);
        }
        if (profile) {
          this.newBadges.set(profile.badges.filter((b) => b.matchdayId === matchdayId));
        }

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
