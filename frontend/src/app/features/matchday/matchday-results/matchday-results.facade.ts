import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { PredictionsService } from '../../../core/services/predictions.service';
import { RankingsService } from '../../../core/services/rankings.service';
import { StreaksService } from '../../../core/services/streaks.service';
import { ProfileService } from '../../../core/services/profile.service';
import { GroupsService } from '../../../core/services/groups.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { AuthService } from '../../../core/services/auth.service';
import { Matchday } from '../../../core/models/matchday.model';
import { Prediction } from '../../../core/models/prediction.model';
import { UserBadge } from '../../../core/models/profile.model';
import { Competition } from '../../../core/models/competition.model';
import { ScoringMode } from '../../../core/models/group.model';
import { badgeArtId } from '../../../shared/utils/badge-art';

@Injectable()
export class MatchdayResultsFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly rankingsService = inject(RankingsService);
  private readonly streaksService = inject(StreaksService);
  private readonly profileService = inject(ProfileService);
  private readonly groupsService = inject(GroupsService);
  readonly activeGroupService = inject(ActiveGroupService);
  private readonly authService = inject(AuthService);
  private readonly toast = inject(ToastService);

  /** Si viene en la ruta, estamos viendo las quinielas de otro miembro del grupo en vez de las propias. */
  readonly routeUserId = this.route.snapshot.paramMap.get('userId');
  private readonly currentUserId = this.authService.currentUser()?.id ?? null;
  readonly viewingSelf = !this.routeUserId || this.routeUserId === this.currentUserId;

  readonly loading = signal(true);
  readonly navigating = signal(false);
  readonly switchingCompetition = signal(false);
  readonly locked = signal(false);
  readonly matchday = signal<Matchday | null>(null);
  readonly activeCompetitions = signal<Competition[]>([]);
  readonly predictions = signal<Prediction[]>([]);
  /** Todas las predicciones del grupo para esta jornada (sin filtrar por usuario), para la comparativa de todos. */
  readonly allPredictions = signal<Prediction[]>([]);
  readonly targetUserName = signal<string | null>(null);
  readonly position = signal<{ pos: number; total: number } | null>(null);
  readonly currentStreak = signal(0);
  readonly newBadges = signal<UserBadge[]>([]);
  /** Se pone a true cuando "siguiente"/"anterior" ya devolvio null o una jornada aun no cerrada. */
  readonly noNextAvailable = signal(false);
  readonly noPreviousAvailable = signal(false);

  readonly hasMultipleCompetitions = computed(() => this.activeCompetitions().length > 1);
  /**
   * Del grupo cargado directamente en ngOnInit (getById), no del
   * ActiveGroupService compartido: ese depende de una lista de grupos
   * cargada en otra pantalla, que puede no estar lista todavia si se entra
   * aqui directamente — con esto se evitaba tratar por error un grupo de
   * resultado exacto como 1X2 (predicciones que sí tenian marcador exacto
   * se veian como "?"/N/A).
   */
  readonly scoringMode = signal<ScoringMode>('ONE_X_TWO');
  readonly totalPoints = computed(() => this.predictions().reduce((sum, p) => sum + (p.pointsEarned ?? 0), 0));
  readonly hits = computed(() => this.predictions().filter((p) => (p.pointsEarned ?? 0) > 0).length);
  readonly rescueHits = computed(
    () => this.predictions().filter((p) => p.doubleChanceOption && (p.pointsEarned ?? 0) > 0).length,
  );

  /** Un miembro por columna en la comparativa de todos, ordenados por nombre; "tu" fila destacada aparte en la plantilla. */
  readonly comparisonMembers = computed(() => {
    const seen = new Map<string, string>();
    for (const prediction of this.allPredictions()) {
      if (prediction.user?.name) {
        seen.set(prediction.userId, prediction.user.name);
      }
    }
    return [...seen.entries()]
      .map(([userId, name]) => ({ userId, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  init(): void {
    const matchdayId = this.route.snapshot.paramMap.get('matchdayId')!;
    this.loadMatchday(matchdayId);

    const groupId = this.activeGroupService.activeId();
    if (groupId) {
      this.groupsService.getById(groupId).subscribe((group) => {
        this.activeCompetitions.set(
          (group.groupCompetitions ?? []).filter((gc) => gc.isActive).map((gc) => gc.competition),
        );
        this.scoringMode.set(group.scoringMode);
      });
    }
  }

  /** Cambia de competicion sin salir de la pantalla: va a la jornada cerrada mas reciente de esa liga para el mismo jugador. */
  switchCompetition(competitionId: string): void {
    const groupId = this.activeGroupService.activeId();
    const current = this.matchday();
    if (!groupId || !current || competitionId === current.competitionId || this.switchingCompetition()) return;

    this.switchingCompetition.set(true);
    this.matchdaysService.getLatestLockedMatchday(groupId, competitionId).subscribe({
      next: (matchday) => {
        this.switchingCompetition.set(false);
        if (!matchday) {
          this.toast.show('Todavia no hay jornadas cerradas para esa competicion');
          return;
        }
        this.noNextAvailable.set(false);
        this.noPreviousAvailable.set(false);
        this.goTo(matchday.id);
        this.loadMatchday(matchday.id);
      },
      error: () => {
        this.switchingCompetition.set(false);
        this.toast.show('No se pudo cargar la competicion');
      },
    });
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
          this.toast.show(
            direction === 'previous' ? 'No hay jornada anterior cerrada' : 'La siguiente jornada todavia no ha cerrado',
          );
          return;
        }
        this.noNextAvailable.set(false);
        this.noPreviousAvailable.set(false);
        this.goTo(next.id);
        this.loadMatchday(next.id);
      },
      error: () => {
        this.navigating.set(false);
        this.toast.show('No se pudo cargar la jornada');
      },
    });
  }

  /** Mantiene la URL sincronizada (compartible / recargable) sin recrear el componente. */
  private goTo(matchdayId: string): void {
    const path = this.viewingSelf
      ? ['/matchday', matchdayId, 'results']
      : ['/matchday', matchdayId, 'results', this.routeUserId!];
    this.router.navigate(path, { replaceUrl: true });
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
        this.allPredictions.set(predictions);
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
    if (this.scoringMode() === 'EXACT_SCORE') {
      if (prediction.predictedHomeScore == null || prediction.predictedAwayScore == null) return '?';
      return `${prediction.predictedHomeScore}-${prediction.predictedAwayScore}`;
    }
    if (prediction.doubleChanceOption) {
      return { HOME_OR_DRAW: '1X', DRAW_OR_AWAY: 'X2', HOME_OR_AWAY: '12' }[prediction.doubleChanceOption];
    }
    return prediction.choice ? this.choiceLabel(prediction.choice) : '?';
  }

  matchLabel(prediction: Prediction, matchday: Matchday): string {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match ? `${match.homeTeam} - ${match.awayTeam}` : '';
  }

  /** La jornada puede estar cerrada sin haber terminado del todo (ver puntuacion en vivo): este partido concreto puede seguir sin jugarse. */
  isMatchPending(prediction: Prediction, matchday: Matchday): boolean {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match ? match.status !== 'FINISHED' : false;
  }

  scoreLabel(prediction: Prediction, matchday: Matchday): string {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match ? `${match.homeScore} - ${match.awayScore}` : '';
  }

  realLabel(prediction: Prediction, matchday: Matchday): string {
    const match = matchday.matches.find((m) => m.id === prediction.matchId);
    return match?.result ? this.choiceLabel(match.result) : '?';
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  artId(code: string): string | null {
    return badgeArtId(code);
  }

  predictionFor(matchId: string, userId: string): Prediction | undefined {
    return this.allPredictions().find((p) => p.matchId === matchId && p.userId === userId);
  }

  cellLabel(prediction: Prediction | undefined): string {
    return prediction ? this.pickLabel(prediction) : '-';
  }

  cellClass(prediction: Prediction | undefined): 'hit' | 'miss' | 'pending' | 'none' {
    if (!prediction) return 'none';
    if (prediction.pointsEarned == null) return 'pending';
    return prediction.pointsEarned > 0 ? 'hit' : 'miss';
  }
}
