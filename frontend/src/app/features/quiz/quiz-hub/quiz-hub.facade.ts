import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { QuizService } from '../../../core/services/quiz.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { QuizCompetition, QuizOverview, QuizRanking, QuizRankingRow, QuizSummary } from '../../../core/models/quiz.model';
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
  pickCompetitionQuizzes,
  quizAction,
  quizActionLabel,
  quizErrorCode,
  quizErrorMessage,
  quizStatusLabel,
} from '../domain/quiz-rules';

export type LoadState = 'loading' | 'ready' | LoadFailure;

/** Liga elegida para jugar, recordada entre visitas (solo comodidad: si falla el almacenamiento, se elige otra). */
export const QUIZ_COMPETITION_STORAGE_KEY = 'piqo.quiz.competitionId';
export const QUIZ_RANKING_PAGE_SIZE = 20;

@Injectable()
export class QuizHubFacade {
  private readonly quizService = inject(QuizService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly currentUserId = this.authService.currentUser()?.id ?? null;

  // ---- Centro: ligas y jornadas ------------------------------------------
  readonly overviewState = signal<LoadState>('loading');
  readonly competitions = signal<QuizCompetition[]>([]);
  private readonly quizzes = signal<QuizSummary[]>([]);
  readonly selectedCompetitionId = signal<string | null>(null);
  readonly startingQuizId = signal<string | null>(null);
  /** Hora del servidor estimada (reloj del dispositivo + desfase), solo para el contador. */
  readonly now = signal(Date.now());
  private offsetMs = 0;
  /** Cierres por los que ya se volvio a pedir el resumen: uno por cierre, nunca uno por segundo. */
  private readonly refreshedCloses = new Set<string>();
  private overviewRequestId = 0;

  readonly selectedCompetition = computed(
    () => this.competitions().find((c) => c.id === this.selectedCompetitionId()) ?? null,
  );
  private readonly selectedCards = computed(() =>
    pickCompetitionQuizzes(this.quizzes().filter((q) => q.competition.id === this.selectedCompetitionId())),
  );
  readonly primaryQuiz = computed(() => this.selectedCards().primary);
  readonly previousQuiz = computed(() => this.selectedCards().previous);

  // ---- Clasificacion ---------------------------------------------------------
  /** Liga del filtro de la clasificacion (null = General). Independiente de la liga elegida para jugar. */
  readonly rankingCompetitionId = signal<string | null>(null);
  /** Temporada pedida (null = la que el servidor considere actual). */
  readonly rankingSeason = signal<string | null>(null);
  readonly rankingState = signal<LoadState>('loading');
  readonly rankingRows = signal<QuizRankingRow[]>([]);
  readonly rankingMe = signal<QuizRankingRow | null>(null);
  readonly rankingTotal = signal(0);
  readonly rankingSeasonLabel = signal<string | null>(null);
  readonly rankingProvisional = signal(false);
  readonly loadingMore = signal(false);
  private nextCursor: string | null = null;
  private rankingRequestId = 0;

  private readonly rankingHasNext = signal(false);
  readonly hasMoreRanking = computed(() => this.rankingState() === 'ready' && this.rankingHasNext());
  /** La fila propia fuera de lo cargado: se fija aparte para que siempre se vea. */
  readonly myRowOutsidePage = computed(() => {
    const me = this.rankingMe();
    if (!me) return null;
    return this.rankingRows().some((row) => row.userId === me.userId) ? null : me;
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
    this.loadRanking(false);
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
    this.quizzes.set(overview.quizzes);
    const current = this.selectedCompetitionId();
    if (!current || !overview.competitions.some((c) => c.id === current)) {
      this.selectedCompetitionId.set(this.defaultCompetitionId(overview));
    }
    this.overviewState.set('ready');
  }

  /** La recordada si sigue existiendo; si no, la primera con una jornada abierta; si no, la primera. */
  private defaultCompetitionId(overview: QuizOverview): string | null {
    const stored = readStoredCompetition();
    if (stored && overview.competitions.some((c) => c.id === stored)) return stored;
    const withOpen = overview.competitions.find((c) =>
      overview.quizzes.some((q) => q.competition.id === c.id && q.status === 'OPEN'),
    );
    return withOpen?.id ?? overview.competitions[0]?.id ?? null;
  }

  selectCompetition(competitionId: string): void {
    this.selectedCompetitionId.set(competitionId);
    try {
      localStorage.setItem(QUIZ_COMPETITION_STORAGE_KEY, competitionId);
    } catch {
      // Sin almacenamiento: la eleccion dura solo esta visita.
    }
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
    return competitionTrophyId(competition.code);
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

  setRankingCompetition(competitionId: string | null): void {
    if (competitionId === this.rankingCompetitionId()) return;
    this.rankingCompetitionId.set(competitionId);
    this.loadRanking(false);
  }

  setRankingSeason(seasonLabel: string): void {
    if (seasonLabel === (this.rankingSeason() ?? this.rankingSeasonLabel())) return;
    this.rankingSeason.set(seasonLabel);
    this.loadRanking(false);
  }

  retryRanking(): void {
    this.loadRanking(false);
  }

  loadMoreRanking(): void {
    if (!this.hasMoreRanking() || this.loadingMore()) return;
    this.loadRanking(true);
  }

  isMe(row: QuizRankingRow): boolean {
    return row.userId === this.currentUserId;
  }

  private loadRanking(append: boolean): void {
    const request = ++this.rankingRequestId;
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loadingMore.set(false);
      this.rankingState.set('loading');
    }
    this.quizService
      .getRanking({
        competitionId: this.rankingCompetitionId(),
        seasonLabel: this.rankingSeason(),
        cursor: append ? this.nextCursor : null,
        limit: QUIZ_RANKING_PAGE_SIZE,
      })
      .subscribe({
        next: (ranking) => {
          // Respuesta de un filtro anterior (se cambio de liga o temporada mientras llegaba): se descarta.
          if (request !== this.rankingRequestId) return;
          this.applyRanking(ranking, append);
        },
        error: (error: HttpErrorResponse) => {
          if (request !== this.rankingRequestId) return;
          if (append) {
            this.loadingMore.set(false);
            this.toast.show(error.status === 0 ? t('quiz.sinConexion') : t('quiz.errorCargarMas'));
            return;
          }
          this.rankingState.set(loadFailureOf(error.status));
        },
      });
  }

  private applyRanking(ranking: QuizRanking, append: boolean): void {
    this.rankingRows.set(append ? [...this.rankingRows(), ...ranking.rows] : ranking.rows);
    this.rankingMe.set(ranking.me);
    this.rankingTotal.set(ranking.total);
    this.rankingSeasonLabel.set(ranking.seasonLabel);
    this.rankingProvisional.set(ranking.provisional);
    this.nextCursor = ranking.nextCursor;
    this.rankingHasNext.set(ranking.nextCursor !== null);
    this.loadingMore.set(false);
    this.rankingState.set('ready');
  }
}

function readStoredCompetition(): string | null {
  try {
    return localStorage.getItem(QUIZ_COMPETITION_STORAGE_KEY);
  } catch {
    return null;
  }
}
