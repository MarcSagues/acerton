import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subject, catchError, concatMap, map, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { QuizService } from '../../../core/services/quiz.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { QuizDetail, QuizErrorCode, QuizOptionCode, QuizQuestion } from '../../../core/models/quiz.model';
import { formatCountdown } from '../../../shared/countdown.util';
import { t } from '../../../core/i18n/translate';
import {
  LoadFailure,
  QuestionOutcome,
  answeredCount,
  clockOffsetMs,
  isClosedError,
  isPastClose,
  loadFailureOf,
  optionLabel,
  outcomeLabel,
  questionOutcome,
  questionText,
  quizErrorCode,
  quizErrorMessage,
  resumeIndex,
} from '../domain/quiz-rules';

export type PlayView = 'intro' | 'question' | 'summary' | 'results';
export type PlayLoadState = 'loading' | 'ready' | LoadFailure;

/**
 * Estado del guardado de UNA pregunta. `option` es la que se esta enviando (o
 * la que fallo, para reintentar); lo que cuenta como guardado es siempre
 * `selectedOption` de la ultima respuesta del servidor.
 */
export interface SaveState {
  status: 'saving' | 'saved' | 'error';
  option: QuizOptionCode;
  message?: string;
}

interface WriteRequest {
  questionId: string;
  option: QuizOptionCode;
}

type WriteResult = { request: WriteRequest; detail: QuizDetail } | { request: WriteRequest; error: HttpErrorResponse };

@Injectable()
export class QuizPlayFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly quizService = inject(QuizService);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  readonly quizId = this.route.snapshot.paramMap.get('quizId') ?? '';

  readonly loadState = signal<PlayLoadState>('loading');
  readonly detail = signal<QuizDetail | null>(null);
  readonly view = signal<PlayView>('question');
  readonly stepIndex = signal(0);
  readonly saveStates = signal<Record<string, SaveState>>({});
  /** El quiz se ha cerrado mientras se jugaba (contador o QUIZ_CLOSED al guardar). */
  readonly closedWhilePlaying = signal(false);
  readonly starting = signal(false);
  readonly completing = signal(false);
  readonly actionError = signal<string | null>(null);
  readonly now = signal(Date.now());
  private offsetMs = 0;
  /** Cierre por el que ya se volvio a preguntar al servidor (uno por valor de closesAt). */
  private refreshedClose: string | null = null;
  private refreshing = false;

  /**
   * Las escrituras van en fila (concatMap): cada respuesta del servidor trae el
   * detalle completo, y en orden la ultima siempre refleja todas las anteriores.
   */
  private readonly writes = new Subject<WriteRequest>();

  readonly quiz = computed(() => this.detail()?.quiz ?? null);
  readonly questions = computed(() => this.detail()?.questions ?? []);
  readonly total = computed(() => this.questions().length);
  readonly current = computed<QuizQuestion | null>(() => this.questions()[this.stepIndex()] ?? null);
  readonly answered = computed(() => answeredCount(this.questions()));
  readonly allAnswered = computed(() => this.total() > 0 && this.answered() === this.total());
  readonly completed = computed(() => !!this.quiz()?.participation?.completedAt);
  /** Pasado el cierre segun el reloj corregido: bloquea mientras el servidor lo confirma. */
  readonly pastClose = computed(() => {
    const quiz = this.quiz();
    return !!quiz && isPastClose(quiz.closesAt, this.now());
  });
  readonly editable = computed(
    () =>
      this.detail()?.canAnswer === true &&
      this.quiz()?.participation != null &&
      !this.pastClose() &&
      !this.closedWhilePlaying(),
  );
  readonly countdown = computed(() => {
    const quiz = this.quiz();
    if (!quiz || !this.detail()?.canAnswer || this.pastClose()) return null;
    return formatCountdown(new Date(quiz.closesAt), new Date(this.now()));
  });
  readonly currentSave = computed(() => {
    const question = this.current();
    return question ? (this.saveStates()[question.id] ?? null) : null;
  });
  readonly anySaving = computed(() => Object.values(this.saveStates()).some((s) => s.status === 'saving'));
  readonly isLast = computed(() => this.stepIndex() >= this.total() - 1);
  /** Preguntas validas (sin anuladas) y puntos, para el resumen de resultados. */
  readonly validCount = computed(() => this.questions().filter((q) => q.resolution !== 'VOID').length);
  readonly points = computed(() => this.quiz()?.participation?.points ?? 0);
  readonly pendingCount = computed(() => this.questions().filter((q) => q.resolution === 'PENDING').length);

  constructor() {
    this.writes
      .pipe(
        concatMap((request) => this.send(request)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((result) => this.onWriteResult(result));
  }

  init(): void {
    this.load();
    const tick = setInterval(() => this.onTick(), 1000);
    this.destroyRef.onDestroy(() => clearInterval(tick));
  }

  load(): void {
    this.loadState.set('loading');
    this.quizService.getQuiz(this.quizId).subscribe({
      next: (detail) => {
        this.applyDetail(detail);
        this.view.set(this.initialView(detail));
        this.stepIndex.set(resumeIndex(detail.questions));
        this.loadState.set('ready');
      },
      error: (error: HttpErrorResponse) => this.loadState.set(loadFailureOf(error.status)),
    });
  }

  private initialView(detail: QuizDetail): PlayView {
    if (!detail.canAnswer) return 'results';
    if (!detail.quiz.participation) return 'intro';
    return detail.quiz.participation.completedAt ? 'summary' : 'question';
  }

  private applyDetail(detail: QuizDetail): void {
    this.offsetMs = clockOffsetMs(detail.serverNow, Date.now());
    this.now.set(Date.now() + this.offsetMs);
    this.detail.set(detail);
  }

  // ---- Participacion ----------------------------------------------------------

  start(): void {
    if (this.starting()) return;
    this.starting.set(true);
    this.actionError.set(null);
    this.quizService.start(this.quizId).subscribe({
      next: (detail) => {
        this.starting.set(false);
        this.applyDetail(detail);
        if (!detail.canAnswer) {
          this.onClosed();
          return;
        }
        this.stepIndex.set(resumeIndex(detail.questions));
        this.view.set('question');
      },
      error: (error: HttpErrorResponse) => {
        this.starting.set(false);
        this.handleActionError(error);
      },
    });
  }

  select(option: QuizOptionCode): void {
    const question = this.current();
    if (!question || !this.editable()) return;
    const state = this.saveStates()[question.id];
    if (state?.status === 'saving') return;
    if (question.selectedOption === option && state?.status !== 'error') return;
    this.enqueue({ questionId: question.id, option });
  }

  retry(questionId: string): void {
    const state = this.saveStates()[questionId];
    if (!state || state.status !== 'error' || !this.editable()) return;
    this.enqueue({ questionId, option: state.option });
  }

  private enqueue(request: WriteRequest): void {
    this.setSaveState(request.questionId, { status: 'saving', option: request.option });
    this.writes.next(request);
  }

  private send(request: WriteRequest): Observable<WriteResult> {
    return this.quizService.saveAnswers(this.quizId, [request]).pipe(
      map((detail): WriteResult => ({ request, detail })),
      catchError((error: HttpErrorResponse) => of<WriteResult>({ request, error })),
    );
  }

  private onWriteResult(result: WriteResult): void {
    const { request } = result;
    if ('detail' in result) {
      this.applyDetail(result.detail);
      const saved = result.detail.questions.find((q) => q.id === request.questionId)?.selectedOption === request.option;
      this.setSaveState(
        request.questionId,
        saved ? { status: 'saved', option: request.option } : { status: 'error', option: request.option, message: t('quiz.errorGuardar') },
      );
      if (!result.detail.canAnswer) this.onClosed();
      return;
    }
    const code = quizErrorCode(result.error.error);
    this.setSaveState(request.questionId, {
      status: 'error',
      option: request.option,
      message: this.errorText(result.error, code),
    });
    if (isClosedError(code)) this.onClosed();
  }

  private setSaveState(questionId: string, state: SaveState): void {
    this.saveStates.update((current) => ({ ...current, [questionId]: state }));
  }

  complete(): void {
    if (this.completing() || !this.editable() || !this.allAnswered() || this.anySaving()) return;
    this.completing.set(true);
    this.actionError.set(null);
    this.quizService.complete(this.quizId).subscribe({
      next: (detail) => {
        this.completing.set(false);
        this.applyDetail(detail);
        if (!detail.canAnswer) {
          this.onClosed();
          return;
        }
        this.toast.show(t('quiz.completadoToast'));
      },
      error: (error: HttpErrorResponse) => {
        this.completing.set(false);
        this.handleActionError(error);
      },
    });
  }

  private handleActionError(error: HttpErrorResponse): void {
    const code = quizErrorCode(error.error);
    this.actionError.set(this.errorText(error, code));
    if (isClosedError(code)) this.onClosed();
  }

  private errorText(error: HttpErrorResponse, code: QuizErrorCode | null): string {
    return error.status === 0 ? t('quiz.sinConexionGuardar') : quizErrorMessage(code);
  }

  // ---- Cierre -------------------------------------------------------------------

  private onTick(): void {
    this.now.set(Date.now() + this.offsetMs);
    const detail = this.detail();
    if (!detail?.canAnswer || !this.pastClose() || this.refreshedClose === detail.quiz.closesAt) return;
    this.refreshedClose = detail.quiz.closesAt;
    this.refresh();
  }

  /**
   * El quiz ya no admite respuestas: se avisa y se vuelve a pedir el detalle
   * para ensenar solo lo que el servidor tiene guardado.
   */
  private onClosed(): void {
    const wasPlaying = this.view() !== 'results';
    if (wasPlaying) this.closedWhilePlaying.set(true);
    this.refresh();
  }

  private refresh(): void {
    if (this.refreshing) return;
    this.refreshing = true;
    this.quizService.getQuiz(this.quizId).subscribe({
      next: (detail) => {
        this.refreshing = false;
        this.applyDetail(detail);
        if (!detail.canAnswer) {
          if (this.view() !== 'results') this.closedWhilePlaying.set(true);
          // Solo cuenta lo confirmado: los guardados en vuelo o fallidos dejan de mostrarse.
          this.saveStates.set({});
          this.view.set('results');
        }
      },
      error: () => {
        this.refreshing = false;
        if (this.closedWhilePlaying()) {
          this.saveStates.set({});
          this.view.set('results');
        }
      },
    });
  }

  // ---- Navegacion ------------------------------------------------------------------

  next(): void {
    if (this.currentSave()?.status === 'saving') return;
    if (this.isLast()) {
      this.view.set('summary');
      return;
    }
    this.stepIndex.update((i) => i + 1);
  }

  previous(): void {
    if (this.stepIndex() > 0) this.stepIndex.update((i) => i - 1);
  }

  goToQuestion(index: number): void {
    if (!this.editable() || index < 0 || index >= this.total()) return;
    this.stepIndex.set(index);
    this.view.set('question');
  }

  showSummary(): void {
    this.view.set('summary');
  }

  backToHub(): void {
    this.router.navigate(['/quiz']);
  }

  // ---- Presentacion ------------------------------------------------------------------

  /** Opcion que se pinta como elegida: la que se esta guardando, o la confirmada por el servidor. */
  displayedOption(question: QuizQuestion): QuizOptionCode | null {
    const state = this.saveStates()[question.id];
    return state?.status === 'saving' ? state.option : question.selectedOption;
  }

  /** El ultimo intento de guardar esta pregunta fallo (lo confirmado sigue siendo lo anterior). */
  saveFailed(question: QuizQuestion): boolean {
    return this.saveStates()[question.id]?.status === 'error';
  }

  questionText(question: QuizQuestion): string {
    return questionText(question);
  }

  optionLabel(option: QuizOptionCode, question: QuizQuestion): string {
    return optionLabel(option, question.match);
  }

  answerLabel(question: QuizQuestion): string {
    return question.selectedOption ? optionLabel(question.selectedOption, question.match) : t('quiz.sinResponder');
  }

  outcome(question: QuizQuestion): QuestionOutcome {
    return questionOutcome(question);
  }

  outcomeLabel(question: QuizQuestion): string {
    return outcomeLabel(questionOutcome(question));
  }
}
