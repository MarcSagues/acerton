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
import { CurrentMatchdayEntry, Match, PredictionChoice } from '../../../core/models/matchday.model';
import { DoubleChanceOption } from '../../../core/models/prediction.model';
import { ComebackStatus } from '../../../core/models/profile.model';
import { formatCountdown } from '../../../shared/countdown.util';

interface MatchPredictionState {
  choice: PredictionChoice | null;
  doubleChanceOption: DoubleChanceOption | null;
  saving: boolean;
  saved: boolean;
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

  readonly predictionState = new Map<string, MatchPredictionState>();

  readonly activeEntry = computed(() => this.entries()[this.activeTabIndex()] ?? null);
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
  readonly doneCount = computed(() => {
    const entry = this.activeEntry();
    if (!entry) return 0;
    return entry.matchday.matches.filter((m) => {
      const state = this.predictionState.get(m.id);
      return !!(state?.choice || state?.doubleChanceOption);
    }).length;
  });
  readonly progressPct = computed(() => {
    const entry = this.activeEntry();
    if (!entry || entry.matchday.matches.length === 0) return '0%';
    return `${Math.round((this.doneCount() / entry.matchday.matches.length) * 100)}%`;
  });

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
    const groupId = this.activeGroupService.activeId();
    if (groupId) {
      this.refreshComeback(groupId);
    }
  }

  private refreshComeback(groupId: string): void {
    const matchdayId = this.activeEntry()?.matchday.id;
    this.wildcardsService
      .getComebackStatus(groupId, matchdayId)
      .subscribe((status) => this.comeback.set(status));
  }

  private loadExistingPredictions(groupId: string, entries: CurrentMatchdayEntry[]): void {
    for (const entry of entries) {
      if (entry.matchday.status === 'FINISHED') {
        continue;
      }
      this.predictionsService.getMine(groupId, entry.matchday.id).subscribe((predictions) => {
        for (const prediction of predictions) {
          this.predictionState.set(prediction.matchId, {
            choice: prediction.choice,
            doubleChanceOption: prediction.doubleChanceOption,
            saving: false,
            saved: true,
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
      state = { choice: null, doubleChanceOption: null, saving: false, saved: false };
      this.predictionState.set(matchId, state);
    }
    return state;
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

  private save(matchId: string, state: MatchPredictionState): void {
    const groupId = this.activeGroupService.activeId();
    if (!groupId) return;
    if (!state.choice && !state.doubleChanceOption) return;

    state.saving = true;
    state.saved = false;

    this.predictionsService
      .submit(groupId, {
        matchId,
        choice: state.doubleChanceOption ? undefined : (state.choice ?? undefined),
        doubleChanceOption: state.doubleChanceOption ?? undefined,
      })
      .subscribe({
        next: () => {
          state.saving = false;
          state.saved = true;
          this.refreshComeback(groupId);
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
