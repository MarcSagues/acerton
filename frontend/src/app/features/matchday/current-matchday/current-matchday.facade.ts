import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatchdaysService } from '../../../core/services/matchdays.service';
import { PredictionsService } from '../../../core/services/predictions.service';
import { WildcardsService } from '../../../core/services/wildcards.service';
import { ActiveGroupService } from '../../../core/services/active-group.service';
import { CurrentMatchdayEntry, Matchday, Match, PredictionChoice } from '../../../core/models/matchday.model';
import { DoubleChanceOption } from '../../../core/models/prediction.model';
import { ComebackStatus } from '../../../core/models/profile.model';
import { formatCountdown } from '../../../shared/countdown.util';
import {
  PredictionSelection,
  isMatchPredictable as domainIsMatchPredictable,
  isPredictionHit,
  lockedMatchLabel,
  matchDayLabel as domainMatchDayLabel,
  pointsForPrediction,
  predictionLabel,
  predictionSummary,
} from '../domain/prediction-rules';

export interface MatchPredictionState extends PredictionSelection {
  saving: boolean;
  saved: boolean;
  /** true si el ultimo intento de guardado fallo y no se ha reintentado todavia. */
  error: boolean;
  /**
   * Se incrementa en cada llamada a save() para este partido. La respuesta
   * de una llamada solo puede tocar saving/saved/error si su numero sigue
   * siendo el mas reciente al llegar — evita que una respuesta antigua
   * (fuera de orden) pise el estado de una seleccion mas nueva.
   */
  requestSeq: number;
  /**
   * 100 = nada dibujado, 0 = contorno completo (mismas unidades que
   * pathLength="100" en el <rect> del SVG). Avanza mientras se espera la
   * respuesta del servidor (sin saber cuanto va a tardar, se acerca a un
   * limite asintotico sin llegar nunca del todo) y solo llega a 0 de
   * verdad cuando la respuesta ya esta aqui — la duracion real del efecto
   * la marca la petencion, no un tiempo fijo.
   */
  drawOffset: number;
  /** requestAnimationFrame en curso para animar drawOffset, si hay alguno. */
  progressFrame: number | null;
}

const VIEW_STORAGE_KEY = 'piqo-jornada-vista';

export type MatchdayView = 'filas' | 'visual';

@Injectable()
export class CurrentMatchdayFacade {
  private readonly activeGroupService = inject(ActiveGroupService);
  private readonly router = inject(Router);
  private readonly matchdaysService = inject(MatchdaysService);
  private readonly predictionsService = inject(PredictionsService);
  private readonly wildcardsService = inject(WildcardsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  /** Filas/Visual: "visual" es el valor inicial, se recuerda en el dispositivo por separado del tema (HANDOFF §6). */
  readonly view = signal<MatchdayView>(this.readStoredView());

  readonly loading = signal(true);
  readonly entries = signal<CurrentMatchdayEntry[]>([]);
  readonly comeback = signal<ComebackStatus | null>(null);
  readonly activeTabIndex = signal(0);
  readonly now = signal(new Date());
  readonly navigating = signal(false);
  /** Celebracion mostrada solo despues de que el ultimo pronostico haya quedado confirmado por el backend. */
  readonly submissionConfirmed = signal(false);
  readonly justCopiedSummary = signal(false);
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

  setView(view: MatchdayView): void {
    this.view.set(view);
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, view);
    } catch {
      // Privado/sin storage: la vista vuelve a "visual" la proxima vez, no es grave.
    }
  }

  private readStoredView(): MatchdayView {
    try {
      return localStorage.getItem(VIEW_STORAGE_KEY) === 'filas' ? 'filas' : 'visual';
    } catch {
      return 'visual';
    }
  }

  /** Texto de cabecera segun el ciclo de 4 estados de la jornada (HANDOFF §9). */
  cicloTitulo(entry: CurrentMatchdayEntry): string {
    if (entry.matchday.status === 'FINISHED') return `Finalizada · ${entry.competition.name} J${entry.matchday.order}`;
    if (this.isLocked(entry)) return 'Cerrada · en juego';
    if (!this.isMatchdayOpenByTime()) return 'Próxima · abre en';
    return 'Abierta · cierra en';
  }

  cicloMeta(entry: CurrentMatchdayEntry): string {
    if (entry.matchday.status === 'FINISHED') {
      return `${this.totalPoints()} ${this.totalPoints() === 1 ? 'punto' : 'puntos'}`;
    }
    if (this.isLocked(entry)) return `${this.totalPoints()} pts en juego`;
    if (!this.isMatchdayOpenByTime()) return this.opensInLabel();
    return this.countdownLabel();
  }

  /** Aviso de estado bajo la cabecera: warning si el cierre esta cerca, error si fallo el ultimo guardado, info en el resto. */
  cicloAviso(entry: CurrentMatchdayEntry): { text: string; tone: 'warning' | 'error' | 'info' } | null {
    if (this.isLocked(entry) || !this.pickingAllowed()) return null;
    const anyError = entry.matchday.matches.some((m) => this.stateFor(m.id).error);
    if (anyError) {
      return { text: 'No se ha guardado algun pronostico. Revisa tu conexion y reintenta.', tone: 'error' };
    }
    if (this.doneCount() < entry.matchday.matches.length) {
      return { text: 'Se guarda automaticamente al elegir. Puedes editarlo hasta el cierre.', tone: 'info' };
    }
    return { text: `Cierra en ${this.countdownLabel()}. Puedes editar tus elecciones hasta entonces.`, tone: 'warning' };
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
    this.destroyRef.onDestroy(() => {
      clearInterval(interval);
      // Sin esto, el requestAnimationFrame de un guardado todavia en curso al
      // salir de la pantalla seguiria llamandose a si mismo indefinidamente
      // (solo se para comparando requestSeq, que ya no cambia si el
      // componente ha desaparecido).
      for (const state of this.predictionState.values()) {
        if (state.progressFrame != null) {
          cancelAnimationFrame(state.progressFrame);
        }
      }
    });
  }

  private load(groupId: string): void {
    this.loading.set(true);
    this.submissionConfirmed.set(false);
    // Las mismas competiciones (y por tanto los mismos partidos) pueden estar
    // activas en varios grupos del usuario a la vez: sin limpiar aqui, el
    // estado de guardado de un partido en el grupo anterior se quedaba
    // visible al cambiar de grupo activo, aunque en el nuevo grupo no se
    // hubiera enviado ningun pronostico todavia.
    this.predictionState.clear();
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
    this.submissionConfirmed.set(false);
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

  goToCalendar(): void {
    const entry = this.activeEntry();
    if (!entry) return;
    this.router.navigate(['/matchday/calendar'], {
      queryParams: { competitionId: entry.competition.id, competitionName: entry.competition.name },
    });
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
    this.submissionConfirmed.set(false);
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
            error: false,
            requestSeq: 0,
            drawOffset: 0,
            progressFrame: null,
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
    return domainIsMatchPredictable(match, this.now());
  }

  /** No basta con el status persistido: el cron que actualiza resultados puede tardar hasta 10 min en correr. */
  isMatchLocked(match: Match): boolean {
    return !this.isMatchPredictable(match);
  }

  /** Tu pronostico en formato corto (1/X/2, 1X/X2/12, o "H-A" en modo resultado exacto), o null si no enviaste ninguno. */
  pickLabel(matchId: string): string | null {
    return predictionLabel(this.predictionState.get(matchId), this.isExactScore());
  }

  /** null si el partido no ha terminado o no enviaste pronostico. */
  isPickHit(match: Match): boolean | null {
    return isPredictionHit(match, this.predictionState.get(match.id), this.isExactScore());
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
    return pointsForPrediction(match, this.predictionState.get(match.id), this.isExactScore());
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
    return lockedMatchLabel(match);
  }

  /** "Hoy"/"Manana" cuando aplica; si no, fecha corta (dd/MM) en vez del dia de la semana. */
  matchDayLabel(kickoff: string): string {
    return domainMatchDayLabel(kickoff, this.now());
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
        error: false,
        requestSeq: 0,
        drawOffset: 100,
        progressFrame: null,
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
    state.error = false;
    const seq = ++state.requestSeq;
    this.startDrawProgress(state, seq);

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
          // Si ya se ha lanzado una seleccion mas nueva para este partido,
          // esta respuesta va con retraso: dejamos que sea la respuesta de
          // esa seleccion mas nueva la que decida el estado final.
          if (state.requestSeq !== seq) return;
          this.finishDrawProgress(state, seq, () => {
            state.saving = false;
            state.saved = true;
            if (!exact) {
              this.refreshComeback(groupId);
            }
            this.showConfirmationIfComplete();
          });
        },
        error: (error: HttpErrorResponse) => {
          if (state.requestSeq !== seq) return;
          this.finishDrawProgress(state, seq, () => {
            state.saving = false;
            state.error = true;
            this.snackBar.open(error.error?.message ?? 'No se pudo guardar el pronostico', 'Cerrar', {
              duration: 3000,
            });
          });
        },
      });
  }

  private showConfirmationIfComplete(): void {
    const entry = this.activeEntry();
    if (!entry || this.isLocked(entry) || entry.matchday.matches.length === 0) return;
    const allSaved = entry.matchday.matches.every((match) => {
      const state = this.predictionState.get(match.id);
      return !!state?.saved && !state.saving && !state.error && this.pickLabel(match.id) !== null;
    });
    if (allSaved) {
      this.submissionConfirmed.set(true);
      requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    }
  }

  editPredictions(): void {
    this.submissionConfirmed.set(false);
  }

  summaryText(): string {
    const entry = this.activeEntry();
    if (!entry) return '';
    return predictionSummary(entry, this.predictionState, this.isExactScore());
  }

  copySummary(): void {
    if (this.justCopiedSummary()) return;
    navigator.clipboard
      ?.writeText(this.summaryText())
      .then(() => {
        this.justCopiedSummary.set(true);
        setTimeout(() => this.justCopiedSummary.set(false), 2000);
      })
      .catch(() => undefined);
  }

  /**
   * El contorno avanza hacia un limite (nunca llega del todo) mientras se
   * espera: no podemos saber de antemano cuanto va a tardar la peticion, asi
   * que en vez de fijar una duracion de antemano dejamos que la velocidad
   * real de "recorrer todo el borde" la marque la respuesta del servidor
   * (ver finishDrawProgress) — una peticion mas lenta simplemente pasa mas
   * tiempo acercandose al limite antes del remate final.
   */
  private startDrawProgress(state: MatchPredictionState, seq: number): void {
    state.drawOffset = 100;
    const start = performance.now();
    const asymptote = 12;
    const timeConstant = 450;
    const step = () => {
      if (state.requestSeq !== seq) return;
      const elapsed = performance.now() - start;
      state.drawOffset = asymptote + (100 - asymptote) * Math.exp(-elapsed / timeConstant);
      state.progressFrame = requestAnimationFrame(step);
    };
    state.progressFrame = requestAnimationFrame(step);
  }

  /**
   * Ya ha llegado la respuesta real: remata rapido el tramo de contorno que
   * faltaba (para que se vea completo, nunca a medias) y solo entonces
   * ejecuta onDone, que es quien aplica saved/error — el relleno verde (o el
   * borde de error) nunca puede adelantarse a que el contorno se haya
   * cerrado del todo.
   */
  private finishDrawProgress(state: MatchPredictionState, seq: number, onDone: () => void): void {
    if (state.progressFrame != null) {
      cancelAnimationFrame(state.progressFrame);
      state.progressFrame = null;
    }
    const from = state.drawOffset;
    const start = performance.now();
    const duration = 180;
    const step = () => {
      if (state.requestSeq !== seq) return;
      const t = Math.min(1, (performance.now() - start) / duration);
      state.drawOffset = from * (1 - t);
      if (t < 1) {
        state.progressFrame = requestAnimationFrame(step);
      } else {
        state.drawOffset = 0;
        state.progressFrame = null;
        onDone();
      }
    };
    state.progressFrame = requestAnimationFrame(step);
  }
}
