import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import {
  QuizCompetition,
  QuizOverview,
  QuizRanking,
  QuizRankingRow,
  QuizRankingScope,
  QuizSummary,
} from '../../../core/models/quiz.model';
import {
  RankingSegment,
  buildRankingItems,
  mergeSegment,
  pageBefore,
  segmentFromRows,
  windowAround,
} from '../domain/ranking-segments';
import { formatCountdown } from '../../../shared/countdown.util';
import { competitionTrophyId } from '../../../shared/utils/competition-trophy';
import { t } from '../../../core/i18n/translate';
import {
  LoadFailure,
  QuizAction,
  clockOffsetMs,
  isClosedError,
  isPastClose,
  loadFailureOf,
  pickHubQuizzes,
  quizAction,
  quizActionLabel,
  quizErrorCode,
  quizErrorMessage,
  quizStatusLabel,
  quizTitle,
  windowDays,
} from '../domain/quiz-rules';

export type LoadState = 'loading' | 'ready' | LoadFailure;

export const QUIZ_RANKING_PAGE_SIZE = 20;
/** Al saltar a mi puesto sin tenerlo cargado: cuantas filas cargar por encima y por debajo de la mia. */
export const QUIZ_RANKING_NEIGHBOURS = 10;

@Injectable()
export class QuizHubFacade {
  private readonly quizService = inject(QuizService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUserId = this.authService.currentUser()?.id ?? null;

  // ---- Centro: el quiz mixto (todas las ligas) -------------------------------
  readonly overviewState = signal<LoadState>('loading');
  /** Ligas del Quiz: los filtros de la clasificacion. */
  readonly competitions = signal<QuizCompetition[]>([]);
  private readonly quizzes = signal<QuizSummary[]>([]);
  readonly startingQuizId = signal<string | null>(null);
  /** Hora del servidor estimada (reloj del dispositivo + desfase), solo para el contador. */
  readonly now = signal(Date.now());
  private offsetMs = 0;
  /** Cierres por los que ya se volvio a pedir el resumen: uno por cierre, nunca uno por segundo. */
  private readonly refreshedCloses = new Set<string>();
  private overviewRequestId = 0;

  private readonly cards = computed(() => pickHubQuizzes(this.quizzes()));
  readonly primaryQuiz = computed(() => this.cards().primary);
  /** Otros quizzes abiertos a la vez (casi nunca: el de entre semana y el del finde se solapan pocas horas). */
  readonly otherQuizzes = computed(() => this.cards().others);
  readonly previousQuiz = computed(() => this.cards().previous);

  // ---- Clasificacion ---------------------------------------------------------
  /** Filtro de la clasificacion: General (null), Ligas o Champions. */
  readonly rankingScope = signal<QuizRankingScope | null>(null);
  /** Temporada pedida (null = la que el servidor considere actual). */
  readonly rankingSeason = signal<string | null>(null);
  readonly rankingState = signal<LoadState>('loading');
  /** Tramos de la clasificacion ya cargados (ver ranking-segments.ts): uno al abrir, y otro mas al saltar a "mi puesto" si esta lejos. */
  private readonly rankingSegments = signal<RankingSegment[]>([]);
  readonly rankingRows = computed(() => this.rankingSegments().flatMap((segment) => segment.rows));
  /** Los que han jugado van delante: si el primero de la clasificacion no ha jugado, no ha jugado nadie. */
  readonly rankingNobodyPlayed = computed(() => {
    const first = this.rankingRows()[0];
    return !first || (first.rowNumber === 1 && first.quizzesPlayed === 0);
  });
  readonly rankingMe = signal<QuizRankingRow | null>(null);
  readonly rankingTotal = signal(0);
  readonly rankingSeasonLabel = signal<string | null>(null);
  readonly loadingMore = signal(false);
  /** Jugador cuya fila se resalta un momento tras saltar a ella. */
  readonly flashUserId = signal<string | null>(null);
  /**
   * Mientras dura el salto con scroll suave a mi puesto, el scroll infinito se pausa: si no, al pasar por el final de un tramo se
   * cargaria otra pagina, las filas se moverian y el salto se quedaria corto.
   */
  readonly jumping = signal(false);
  private rankingRequestId = 0;
  private readonly rankingInFlight = new Set<string>();

  /** La lista tal como se pinta: filas, centinelas del scroll infinito y huecos entre tramos. */
  readonly rankingItems = computed(() => buildRankingItems(this.rankingSegments(), this.rankingTotal()));
  /** Mi fila esta entre las cargadas (si no, al pulsar "mi puesto" se carga una ventana alrededor). */
  readonly meLoaded = computed(() => {
    const me = this.rankingMe();
    return !!me && this.rankingRows().some((row) => row.userId === me.userId);
  });
  /** Temporadas conocidas (de las jornadas y de la clasificacion), de la mas nueva a la mas antigua. */
  readonly seasonOptions = computed(() => {
    const labels = new Set<string>();
    for (const quiz of this.quizzes()) labels.add(quiz.seasonLabel);
    const current = this.rankingSeasonLabel();
    if (current) labels.add(current);
    return [...labels].sort((a, b) => b.localeCompare(a));
  });

  init(): void {
    this.loadOverview();
    this.loadRanking();
    const tick = setInterval(() => this.onTick(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  // ---- Centro -----------------------------------------------------------------

  loadOverview(): void {
    const request = ++this.overviewRequestId;
    if (this.overviewState() !== 'ready') this.overviewState.set('loading');
    this.quizService.getOverview().subscribe({
      next: (overview) => {
        if (request !== this.overviewRequestId) return;
        this.applyOverview(overview);
      },
      error: (error: HttpErrorResponse) => {
        if (request !== this.overviewRequestId) return;
        // Con datos ya pintados (refresco por cierre), se conservan: el
        // contador sigue bloqueando la accion hasta el siguiente intento.
        if (this.overviewState() !== 'ready') this.overviewState.set(loadFailureOf(error.status));
      },
    });
  }

  private applyOverview(overview: QuizOverview): void {
    this.offsetMs = clockOffsetMs(overview.serverNow, Date.now());
    this.now.set(Date.now() + this.offsetMs);
    this.competitions.set(overview.competitions);
    // `events` llega desde el quiz mixto; un servidor anterior solo manda `quizzes` (uno por liga).
    this.quizzes.set(overview.events ?? overview.quizzes);
    this.overviewState.set('ready');
  }

  private onTick(): void {
    this.now.set(Date.now() + this.offsetMs);
    // Un quiz abierto cuyo cierre ya ha pasado: se pregunta otra vez al
    // servidor (una sola vez por cierre). La clasificacion no depende del
    // contador y no se vuelve a pedir.
    const expired = this.quizzes().find(
      (q) => q.status === 'OPEN' && isPastClose(q.closesAt, this.now()) && !this.refreshedCloses.has(`${q.id}:${q.closesAt}`),
    );
    if (expired) {
      this.refreshedCloses.add(`${expired.id}:${expired.closesAt}`);
      this.loadOverview();
    }
  }

  action(quiz: QuizSummary): QuizAction {
    // Pasado el cierre segun el contador, no se ofrece jugar mientras el servidor no confirme.
    if (quiz.status === 'OPEN' && isPastClose(quiz.closesAt, this.now())) return 'NONE';
    return quizAction(quiz);
  }

  actionLabel(quiz: QuizSummary): string {
    if (quiz.status === 'OPEN' && isPastClose(quiz.closesAt, this.now())) return t('quiz.cerrando');
    return quizActionLabel(this.action(quiz));
  }

  statusLabel(quiz: QuizSummary): string {
    return quizStatusLabel(quiz);
  }

  /** "Cierra en 1d 04h"; null si no esta abierto o ya ha pasado el cierre. */
  countdown(quiz: QuizSummary): string | null {
    if (quiz.status !== 'OPEN' || isPastClose(quiz.closesAt, this.now())) return null;
    return formatCountdown(new Date(quiz.closesAt), new Date(this.now()));
  }

  trophyId(competition: QuizCompetition): string | null {
    return competition.code === 'MIXED' ? null : competitionTrophyId(competition.code);
  }

  title(quiz: QuizSummary): string {
    return quizTitle(quiz);
  }

  /** Primer y ultimo dia de un quiz mixto ("16 oct – 19 oct"); null en los antiguos. */
  days(quiz: QuizSummary): { from: string; to: string } | null {
    return quiz.window ? windowDays(quiz.window) : null;
  }

  open(quiz: QuizSummary): void {
    const action = this.action(quiz);
    if (action === 'NONE' || this.startingQuizId()) return;
    if (action !== 'START') {
      this.router.navigate(['/quiz', quiz.id]);
      return;
    }
    this.startingQuizId.set(quiz.id);
    this.quizService.start(quiz.id).subscribe({
      next: () => {
        this.startingQuizId.set(null);
        this.router.navigate(['/quiz', quiz.id]);
      },
      error: (error: HttpErrorResponse) => {
        this.startingQuizId.set(null);
        const code = quizErrorCode(error.error);
        if (error.status === 0) {
          this.toast.show(t('quiz.sinConexion'));
          return;
        }
        this.toast.show(quizErrorMessage(code));
        if (isClosedError(code)) this.loadOverview();
      },
    });
  }

  // ---- Clasificacion -------------------------------------------------------------

  setRankingScope(scope: QuizRankingScope | null): void {
    if (scope === this.rankingScope()) return;
    this.rankingScope.set(scope);
    this.loadRanking();
  }

  setRankingSeason(seasonLabel: string): void {
    if (seasonLabel === (this.rankingSeason() ?? this.rankingSeasonLabel())) return;
    this.rankingSeason.set(seasonLabel);
    this.loadRanking();
  }

  retryRanking(): void {
    this.loadRanking();
  }

  /** Scroll infinito: carga la pagina que sigue a la fila `end` (el final de un tramo). */
  loadAfter(end: number): void {
    if (this.jumping()) return;
    void this.fetchRange(`after:${end}`, end, QUIZ_RANKING_PAGE_SIZE);
  }

  /** Hueco entre tramos: carga la pagina que precede al tramo que empieza en `start`. */
  loadBefore(start: number): void {
    const page = pageBefore(start, QUIZ_RANKING_PAGE_SIZE);
    if (page) void this.fetchRange(`before:${start}`, page.cursor, page.limit);
  }

  /**
   * Asegura que mi fila esta cargada: si no lo esta, pide una ventana de filas alrededor de mi puesto (para ver a quienes tengo cerca)
   * y la une a lo ya cargado. Devuelve si mi fila quedo cargada.
   */
  async ensureMeLoaded(): Promise<boolean> {
    const me = this.rankingMe();
    if (!me) return false;
    if (!this.meLoaded()) {
      const window = windowAround(me.rowNumber, QUIZ_RANKING_NEIGHBOURS);
      await this.fetchRange(`around:${me.rowNumber}`, window.cursor, window.limit);
    }
    return this.meLoaded();
  }

  /** Resalta un momento la fila de un jugador (tras saltar a ella). */
  flash(userId: string): void {
    this.flashUserId.set(userId);
    setTimeout(() => {
      if (this.flashUserId() === userId) this.flashUserId.set(null);
    }, 1800);
  }

  isMe(row: QuizRankingRow): boolean {
    return row.userId === this.currentUserId;
  }

  /** Primera pagina de la clasificacion (al abrir y al cambiar de liga o temporada): sustituye a lo que hubiera cargado. */
  private loadRanking(): void {
    const request = ++this.rankingRequestId;
    this.rankingInFlight.clear();
    this.loadingMore.set(false);
    this.rankingState.set('loading');
    this.quizService
      .getRanking({
        scope: this.rankingScope(),
        seasonLabel: this.rankingSeason(),
        cursor: null,
        limit: QUIZ_RANKING_PAGE_SIZE,
      })
      .subscribe({
        next: (ranking) => {
          // Respuesta de un filtro anterior (se cambio de liga o temporada mientras llegaba): se descarta.
          if (request !== this.rankingRequestId) return;
          this.applyRanking(ranking, false);
        },
        error: (error: HttpErrorResponse) => {
          if (request !== this.rankingRequestId) return;
          this.rankingState.set(loadFailureOf(error.status));
        },
      });
  }

  /** Pide un tramo de filas (`cursor` = filas a saltar) y lo une a los ya cargados. Una peticion por tramo a la vez. */
  private fetchRange(key: string, cursor: number, limit: number): Promise<boolean> {
    if (this.rankingState() !== 'ready' || this.rankingInFlight.has(key)) return Promise.resolve(false);
    const request = this.rankingRequestId;
    this.rankingInFlight.add(key);
    this.loadingMore.set(true);
    return new Promise((resolve) => {
      this.quizService
        .getRanking({
          scope: this.rankingScope(),
          seasonLabel: this.rankingSeason(),
          cursor: String(cursor),
          limit,
        })
        .subscribe({
          next: (ranking) => {
            this.rankingInFlight.delete(key);
            if (request !== this.rankingRequestId) return resolve(false);
            this.applyRanking(ranking, true);
            resolve(true);
          },
          error: (error: HttpErrorResponse) => {
            this.rankingInFlight.delete(key);
            if (request !== this.rankingRequestId) return resolve(false);
            this.loadingMore.set(this.rankingInFlight.size > 0);
            this.toast.show(error.status === 0 ? t('quiz.sinConexion') : t('quiz.errorCargarMas'));
            resolve(false);
          },
        });
    });
  }

  private applyRanking(ranking: QuizRanking, merge: boolean): void {
    const incoming = segmentFromRows(ranking.rows);
    if (merge) {
      if (incoming) this.rankingSegments.set(mergeSegment(this.rankingSegments(), incoming));
    } else {
      this.rankingSegments.set(incoming ? [incoming] : []);
    }
    this.rankingMe.set(ranking.me);
    this.rankingTotal.set(ranking.total);
    this.rankingSeasonLabel.set(ranking.seasonLabel);
    this.loadingMore.set(this.rankingInFlight.size > 0);
    this.rankingState.set('ready');
  }
}

