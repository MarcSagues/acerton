import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { PredictionsService } from '../../../core/services/predictions.service';
import { WildcardsService } from '../../../core/services/wildcards.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { CurrentMatchdayEntry, Matchday, Match, PredictionChoice } from '../../../core/models/matchday.model';
import { DoubleChanceOption } from '../../../core/models/prediction.model';
import { ComebackStatus } from '../../../core/models/profile.model';
import { formatCountdown } from '../../../shared/countdown.util';

interface MatchPredictionState {
  choice: PredictionChoice | null;
  doubleChanceOption: DoubleChanceOption | null;
  /** Solo en grupos de modo EXACT_SCORE. */
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  saving: boolean;
  saved: boolean;
  /** Solo se rellena una vez el partido termina y se puntua; null mientras tanto. */
  pointsEarned: number | null;
}

@Component({
  selector: 'app-current-matchday',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    GroupSwitcherComponent,
  ],
  templateUrl: './current-matchday.component.html',
  styleUrl: './current-matchday.component.scss',
})
export class CurrentMatchdayComponent {
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly wildcardsService = inject(WildcardsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly entries = signal<CurrentMatchdayEntry[]>([]);
  readonly comeback = signal<ComebackStatus | null>(null);
  readonly activeTabIndex = signal(0);
  readonly now = signal(new Date());
  readonly navigating = signal(false);
  /** Se pone a true cuando "siguiente" ya devolvio null para la jornada mostrada; se resetea al cambiar de jornada o de pestana. */
  readonly noNextAvailable = signal(false);
  /** Id de la jornada "en vivo" de cada pestana (competicion), tal como se cargo al entrar — para saber si te has alejado navegando y poder volver. */
  private readonly liveMatchdayIds = signal<Record<number, string>>({});

  readonly predictionState = new Map<string, MatchPredictionState>();

  readonly activeEntry = computed(() => this.entries()[this.activeTabIndex()] ?? null);
  readonly isExactScore = computed(() => this.activeGroupService.activeGroup()?.scoringMode === 'EXACT_SCORE');
  /**
   * Proximo partido todavia predecible de la jornada activa (el mas cercano
   * de los que no han empezado). No usamos matchday.closesAt para esto: ese
   * campo es el kickoff del primer partido del calendario original, pero un
   * partido puede haberse adelantado varios dias respecto al resto — el
   * "cierre" real relevante para el usuario es el del proximo partido en el
   * que todavia puede predecir.
   */
  readonly nextDeadline = computed(() => {
    const entry = this.activeEntry();
    if (!entry) return null;
    const upcoming = entry.matchday.matches
      .filter((m) => this.isMatchPredictable(m))
      .sort((a, b) => new Date(a.kickoff).getTime() - new Date(b.kickoff).getTime());
    return upcoming[0] ?? null;
  });
  readonly countdownLabel = computed(() => {
    const deadline = this.nextDeadline();
    return deadline ? formatCountdown(new Date(deadline.kickoff), this.now()) : '';
  });
  /** false cuando has navegado a una jornada distinta de la que estaba "en vivo" al entrar. */
  readonly isViewingLive = computed(() => {
    const entry = this.activeEntry();
    if (!entry) return true;
    return this.liveMatchdayIds()[this.activeTabIndex()] === entry.matchday.id;
  });
  /**
   * false cuando la jornada activa todavia no le toca (previsualizada con
   * "siguiente") — el backend es quien decide esto (ver
   * MatchdaysService.canAcceptPredictions), no se replica la regla aqui para
   * evitar que la nocion de "jornada en vivo para volver" (por id) y la de
   * "jornada limite para predecir" (por cierre mas proximo) diverjan entre
   * si, como paso cuando esto se calculaba comparando ordenes en el cliente.
   */
  readonly canPredictActiveMatchday = computed(() => this.activeEntry()?.matchday.canPredict ?? false);
  /** false hasta 4 dias antes del primer partido (matchday.opensAt) — antes de eso no se admiten pronosticos aunque le toque por orden. */
  readonly isMatchdayOpenByTime = computed(() => {
    const entry = this.activeEntry();
    if (!entry) return true;
    return new Date(entry.matchday.opensAt).getTime() <= this.now().getTime();
  });
  /** Se puede predecir solo cuando le toca por orden Y ya se ha abierto la ventana de 4 dias. */
  readonly pickingAllowed = computed(() => this.canPredictActiveMatchday() && this.isMatchdayOpenByTime());
  readonly opensInLabel = computed(() => {
    const entry = this.activeEntry();
    return entry ? formatCountdown(new Date(entry.matchday.opensAt), this.now()) : '';
  });
  /**
   * Metodo normal, no computed(): predictionState es un Map mutado a mano
   * (no un signal), asi que un computed() no detectaria sus cambios y se
   * quedaria con el valor cacheado del primer render (ej. las predicciones
   * ya guardadas que llegan de forma asincrona en loadExistingPredictions).
   * Al ser un metodo se reevalua en cada ciclo de deteccion de cambios,
   * igual que ya hace stateFor() para cada fila.
   */
  doneCount(): number {
    const entry = this.activeEntry();
    if (!entry) return 0;
    const exact = this.isExactScore();
    return entry.matchday.matches.filter((m) => {
      const state = this.predictionState.get(m.id);
      if (exact) {
        return state?.predictedHomeScore != null && state?.predictedAwayScore != null;
      }
      return !!(state?.choice || state?.doubleChanceOption);
    }).length;
  }

  progressPct(): string {
    const entry = this.activeEntry();
    if (!entry || entry.matchday.matches.length === 0) return '0%';
    return `${Math.round((this.doneCount() / entry.matchday.matches.length) * 100)}%`;
  }

  constructor() {
    effect(
      () => {
        const groupId = this.activeGroupService.activeId();
        if (groupId) {
          this.load(groupId);
        }
      },
      { allowSignalWrites: true },
    );

    const interval = setInterval(() => this.now.set(new Date()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(interval));
  }

  private load(groupId: string): void {
    this.loading.set(true);
    this.matchdaysService.getCurrentForGroup(groupId).subscribe({
      next: (entries) => {
        this.entries.set(entries);
        this.liveMatchdayIds.set(Object.fromEntries(entries.map((e, i) => [i, e.matchday.id])));
        this.activeTabIndex.set(0);
        this.loadExistingPredictions(groupId, entries);
        this.refreshComeback(groupId);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  selectTab(index: number): void {
    this.activeTabIndex.set(index);
    this.noNextAvailable.set(false);
    const groupId = this.activeGroupService.activeId();
    if (groupId) {
      this.refreshComeback(groupId);
    }
  }

  navigatePrevious(): void {
    this.navigate('previous');
  }

  navigateNext(): void {
    this.navigate('next');
  }

  /** Vuelve a la jornada "en vivo" de la pestana activa tras haber navegado a otra. */
  goToLive(): void {
    const groupId = this.activeGroupService.activeId();
    const liveId = this.liveMatchdayIds()[this.activeTabIndex()];
    if (!groupId || !liveId || this.navigating()) return;

    this.navigating.set(true);
    this.matchdaysService.getById(liveId).subscribe({
      next: (matchday) => {
        this.navigating.set(false);
        this.noNextAvailable.set(false);
        this.applyMatchdayToActiveTab(matchday, groupId);
      },
      error: () => {
        this.navigating.set(false);
        this.snackBar.open('No se pudo cargar la jornada', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private navigate(direction: 'previous' | 'next'): void {
    const entry = this.activeEntry();
    const groupId = this.activeGroupService.activeId();
    if (!entry || !groupId || this.navigating()) return;

    this.navigating.set(true);
    this.matchdaysService.getAdjacent(entry.matchday.id, direction).subscribe({
      next: (matchday) => {
        this.navigating.set(false);
        if (!matchday) {
          if (direction === 'next') {
            this.noNextAvailable.set(true);
          }
          this.snackBar.open(
            direction === 'previous' ? 'No hay jornada anterior' : 'Todavia no hay jornada siguiente',
            'Cerrar',
            { duration: 2500 },
          );
          return;
        }
        this.noNextAvailable.set(false);
        this.applyMatchdayToActiveTab(matchday, groupId);
      },
      error: () => {
        this.navigating.set(false);
        this.snackBar.open('No se pudo cargar la jornada', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private applyMatchdayToActiveTab(matchday: Matchday, groupId: string): void {
    const idx = this.activeTabIndex();
    this.entries.update((list) => list.map((e, i) => (i === idx ? { ...e, matchday } : e)));
    const entry = this.entries()[idx];
    if (entry) {
      this.loadExistingPredictions(groupId, [entry]);
    }
    this.refreshComeback(groupId);
  }

  private refreshComeback(groupId: string): void {
    const matchdayId = this.activeEntry()?.matchday.id;
    this.wildcardsService
      .getComebackStatus(groupId, matchdayId)
      .subscribe((status) => this.comeback.set(status));
  }

  private loadExistingPredictions(groupId: string, entries: CurrentMatchdayEntry[]): void {
    for (const entry of entries) {
      this.predictionsService.getMine(groupId, entry.matchday.id).subscribe((predictions) => {
        for (const prediction of predictions) {
          this.predictionState.set(prediction.matchId, {
            choice: prediction.choice,
            doubleChanceOption: prediction.doubleChanceOption,
            predictedHomeScore: prediction.predictedHomeScore,
            predictedAwayScore: prediction.predictedAwayScore,
            saving: false,
            saved: true,
            pointsEarned: prediction.pointsEarned,
          });
        }
      });
    }
  }

  /**
   * El bloqueo real es por partido (ver isMatchLocked): un partido admite
   * predicciones hasta su propio kickoff, con independencia de si otros
   * partidos de la misma jornada ya han empezado (el calendario a veces
   * adelanta un partido varios dias respecto al resto). "Jornada bloqueada"
   * (para la pastilla de cabecera, la barra de progreso, etc.) solo
   * significa que ya no queda ningun partido en el que se pueda predecir.
   */
  isLocked(entry: CurrentMatchdayEntry): boolean {
    if (entry.matchday.status === 'FINISHED') {
      return true;
    }
    return entry.matchday.matches.every((m) => this.isMatchLocked(m));
  }

  private isMatchPredictable(match: Match): boolean {
    if (match.status !== 'SCHEDULED') {
      return false;
    }
    return new Date(match.kickoff).getTime() > this.now().getTime();
  }

  /** No basta con el status persistido: el cron que actualiza resultados puede tardar hasta 10 min en correr. */
  isMatchLocked(match: Match): boolean {
    return !this.isMatchPredictable(match);
  }

  /** Tu pronostico en formato corto (1/X/2, 1X/X2/12, o "H-A" en modo resultado exacto), o null si no enviaste ninguno. */
  pickLabel(matchId: string): string | null {
    const state = this.predictionState.get(matchId);
    if (!state) return null;
    if (this.isExactScore()) {
      if (state.predictedHomeScore == null || state.predictedAwayScore == null) return null;
      return `${state.predictedHomeScore}-${state.predictedAwayScore}`;
    }
    if (state.doubleChanceOption) {
      return { HOME_OR_DRAW: '1X', DRAW_OR_AWAY: 'X2', HOME_OR_AWAY: '12' }[state.doubleChanceOption];
    }
    if (state.choice) {
      return state.choice === 'HOME' ? '1' : state.choice === 'AWAY' ? '2' : 'X';
    }
    return null;
  }

  /** HOME/DRAW/AWAY a partir de un marcador, igual que matchday.util.ts computeMatchResult en el backend. */
  private outcomeOf(home: number, away: number): PredictionChoice {
    if (home > away) return 'HOME';
    if (home < away) return 'AWAY';
    return 'DRAW';
  }

  /**
   * En modo resultado exacto: 5 si el marcador previsto es exacto, 2 si solo
   * acierta el ganador/empate, 0 en otro caso. Null si falta algun dato.
   */
  private localExactScorePoints(match: Match, state: MatchPredictionState): number | null {
    if (
      state.predictedHomeScore == null ||
      state.predictedAwayScore == null ||
      match.homeScore == null ||
      match.awayScore == null
    ) {
      return null;
    }
    if (state.predictedHomeScore === match.homeScore && state.predictedAwayScore === match.awayScore) {
      return 5;
    }
    const predicted = this.outcomeOf(state.predictedHomeScore, state.predictedAwayScore);
    const actual = this.outcomeOf(match.homeScore, match.awayScore);
    return predicted === actual ? 2 : 0;
  }

  /** null si el partido no ha terminado o no enviaste pronostico. */
  isPickHit(match: Match): boolean | null {
    const state = this.predictionState.get(match.id);
    if (!state || !match.result) return null;
    if (this.isExactScore()) {
      const points = this.localExactScorePoints(match, state);
      return points == null ? null : points > 0;
    }
    if (state.doubleChanceOption) {
      const coverage: Record<DoubleChanceOption, PredictionChoice[]> = {
        HOME_OR_DRAW: ['HOME', 'DRAW'],
        DRAW_OR_AWAY: ['DRAW', 'AWAY'],
        HOME_OR_AWAY: ['HOME', 'AWAY'],
      };
      return coverage[state.doubleChanceOption].includes(match.result);
    }
    if (!state.choice) return null;
    return state.choice === match.result;
  }

  /**
   * Puntos de este partido. El backend puntua toda la jornada de golpe al
   * terminar (ver PredictionsService.scoreFinishedMatchday), no partido a
   * partido, asi que pointsEarned sigue siendo null aunque este partido
   * concreto ya haya acabado y el acierto ya se sepa — en ese hueco se
   * calcula aqui mismo (1/0, o 5/2/0 en modo resultado exacto) para no
   * obligar a esperar a que cierre el resto de la jornada. Una vez el
   * backend puntua de verdad, ese valor manda siempre.
   */
  pointsFor(match: Match): number {
    const stored = this.predictionState.get(match.id)?.pointsEarned;
    if (stored != null) {
      return stored;
    }
    if (match.status !== 'FINISHED') {
      return 0;
    }
    if (this.isExactScore()) {
      const state = this.predictionState.get(match.id);
      if (!state) return 0;
      return this.localExactScorePoints(match, state) ?? 0;
    }
    return this.isPickHit(match) === true ? 1 : 0;
  }

  /** true si al menos un partido de la jornada activa ya ha terminado, aunque la jornada siga abierta. */
  anyMatchFinished(): boolean {
    const entry = this.activeEntry();
    return entry ? entry.matchday.matches.some((m) => m.status === 'FINISHED') : false;
  }

  /** Suma de puntos de toda la jornada activa (en vivo o ya cerrada). */
  totalPoints(): number {
    const entry = this.activeEntry();
    if (!entry) return 0;
    return entry.matchday.matches.reduce((sum, m) => sum + this.pointsFor(m), 0);
  }

  matchLockedLabel(match: Match): string {
    if (match.status === 'POSTPONED') return 'Aplazado';
    if (match.status === 'CANCELLED') return 'Cancelado';
    return 'En juego';
  }

  private static isSameDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  /** "Hoy"/"Manana" cuando aplica; si no, fecha corta (dd/MM) en vez del dia de la semana. */
  matchDayLabel(kickoff: string): string {
    const date = new Date(kickoff);
    const today = new Date();
    if (CurrentMatchdayComponent.isSameDay(date, today)) {
      return 'Hoy';
    }
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (CurrentMatchdayComponent.isSameDay(date, tomorrow)) {
      return 'Mañana';
    }
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
  }

  stateFor(matchId: string): MatchPredictionState {
    let state = this.predictionState.get(matchId);
    if (!state) {
      state = {
        choice: null,
        doubleChanceOption: null,
        predictedHomeScore: null,
        predictedAwayScore: null,
        saving: false,
        saved: false,
        pointsEarned: null,
      };
      this.predictionState.set(matchId, state);
    }
    return state;
  }

  /** Actualiza el marcador previsto (modo resultado exacto) y guarda si ya hay ambos valores. */
  updatePredictedScore(match: Match, field: 'home' | 'away', rawValue: string): void {
    if (this.isMatchLocked(match)) return;
    const state = this.stateFor(match.id);
    const value = rawValue === '' ? null : Number(rawValue);
    if (field === 'home') {
      state.predictedHomeScore = value;
    } else {
      state.predictedAwayScore = value;
    }
  }

  selectChoice(match: Match, choice: PredictionChoice): void {
    if (this.isMatchLocked(match)) return;
    const state = this.stateFor(match.id);
    state.choice = choice;
    this.save(match.id, state);
  }

  selectDoubleChance(match: Match, option: DoubleChanceOption): void {
    if (this.isMatchLocked(match)) return;
    const state = this.stateFor(match.id);
    state.doubleChanceOption = option;
    this.save(match.id, state);
  }

  /** Activa/desactiva el comodin de remontada para este partido. */
  toggleDoubleChance(match: Match): void {
    if (this.isMatchLocked(match)) return;
    const state = this.stateFor(match.id);
    const comeback = this.comeback();

    if (state.doubleChanceOption) {
      state.doubleChanceOption = null;
      return;
    }

    if (!comeback?.enabled) {
      this.snackBar.open('El comodin de remontada esta desactivado en este grupo', 'Cerrar', {
        duration: 3000,
      });
      return;
    }
    if (comeback.remaining <= 0) {
      this.snackBar.open('No te quedan comodines de remontada disponibles esta jornada', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    state.choice = null;
    state.doubleChanceOption = 'HOME_OR_DRAW';
    this.save(match.id, state);
  }

  save(matchId: string, state: MatchPredictionState): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId) return;
    const exact = this.isExactScore();
    if (exact) {
      if (state.predictedHomeScore == null || state.predictedAwayScore == null) return;
    } else if (!state.choice && !state.doubleChanceOption) {
      return;
    }

    state.saving = true;
    state.saved = false;

    this.predictionsService
      .submit(
        groupId,
        exact
          ? { matchId, predictedHomeScore: state.predictedHomeScore!, predictedAwayScore: state.predictedAwayScore! }
          : {
              matchId,
              choice: state.doubleChanceOption ? undefined : (state.choice ?? undefined),
              doubleChanceOption: state.doubleChanceOption ?? undefined,
            },
      )
      .subscribe({
        next: () => {
          state.saving = false;
          state.saved = true;
          if (!exact) {
            this.refreshComeback(groupId);
          }
        },
        error: (error: HttpErrorResponse) => {
          state.saving = false;
          this.snackBar.open(error.error?.message ?? 'No se pudo guardar el pronostico', 'Cerrar', {
            duration: 3000,
          });
        },
      });
  }
}
