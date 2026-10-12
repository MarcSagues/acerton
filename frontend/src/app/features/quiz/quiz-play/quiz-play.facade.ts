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

/** Pausa tras confirmar el guardado antes de pasar sola a la siguiente pregunta (se ve la eleccion rellena). */
export const AUTO_ADVANCE_MS = 400;
/** Remate del contorno animado al llegar la respuesta (mismo efecto que los botones 1X2 de Jornada). */
export const DRAW_FINISH_MS = 180;
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
  /**
   * Contorno animado de la opcion que se esta guardando, de 0 a 100 (%), por
   * pregunta: avanza hacia un limite mientras se espera y se completa al
   * llegar la respuesta, como el 1X2 de Jornada (ver CurrentMatchdayFacade.
   * startDrawProgress). El estado final (Guardado/error) no se aplica hasta
   * que el contorno se ha cerrado.
   */
  readonly drawProgress = signal<Record<string, number>>({});
  private readonly drawFrames = new Map<string, ReturnType<typeof setTimeout>>();
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
  /** Se entro a una pregunta con "Cambiar" desde el resumen: al guardarla se vuelve al resumen. */
  private returnToSummary = false;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;

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
    this.destroyRef.onDestroy(() => {
      clearInterval(tick);
      this.cancelAutoAdvance();
      for (const frame of this.drawFrames.values()) clearTimeout(frame);
      this.drawFrames.clear();
    });
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
    // Volver a pulsar la respuesta ya guardada no reenvia nada: solo pasa a la siguiente.
    if (question.selectedOption === option && state?.status !== 'error') {
      this.advanceFrom(question.id);
      return;
    }
    this.enqueue({ questionId: question.id, option });
  }

  retry(questionId: string): void {
    const state = this.saveStates()[questionId];
    if (!state || state.status !== 'error' || !this.editable()) return;
    this.enqueue({ questionId, option: state.option });
  }

  private enqueue(request: WriteRequest): void {
    this.setSaveState(request.questionId, { status: 'saving', option: request.option });
    this.startDraw(request.questionId);
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
      if (!result.detail.canAnswer) {
        this.stopDraw(request.questionId);
        this.onClosed();
        return;
      }
      const saved = result.detail.questions.find((q) => q.id === request.questionId)?.selectedOption === request.option;
      this.finishDraw(request.questionId, () => {
        this.setSaveState(
          request.questionId,
          saved ? { status: 'saved', option: request.option } : { status: 'error', option: request.option, message: t('quiz.errorGuardar') },
        );
        // Solo tras la confirmacion del servidor: un fallo deja la pregunta delante para reintentar.
        if (saved) this.scheduleAutoAdvance(request.questionId);
      });
      return;
    }
    const code = quizErrorCode(result.error.error);
    const failed: SaveState = { status: 'error', option: request.option, message: this.errorText(result.error, code) };
    if (isClosedError(code)) {
      this.stopDraw(request.questionId);
      this.setSaveState(request.questionId, failed);
      this.onClosed();
      return;
    }
    this.finishDraw(request.questionId, () => this.setSaveState(request.questionId, failed));
  }

  private setSaveState(questionId: string, state: SaveState): void {
    this.saveStates.update((current) => ({ ...current, [questionId]: state }));
  }

  /** Contorno que se acerca a un limite sin llegar: la duracion real la marca la respuesta. */
  private startDraw(questionId: string): void {
    this.stopDraw(questionId);
    const start = Date.now();
    const step = () => {
      const elapsed = Date.now() - start;
      this.setDraw(questionId, 88 - 88 * Math.exp(-elapsed / 450));
      this.drawFrames.set(questionId, setTimeout(step, 16));
    };
    this.setDraw(questionId, 0);
    this.drawFrames.set(questionId, setTimeout(step, 16));
  }

  /** Remata rapido lo que falta del contorno y solo entonces aplica el resultado. */
  private finishDraw(questionId: string, onDone: () => void): void {
    this.clearDrawFrame(questionId);
    const from = this.drawProgress()[questionId] ?? 0;
    const start = Date.now();
    const step = () => {
      const t = Math.min(1, (Date.now() - start) / DRAW_FINISH_MS);
      this.setDraw(questionId, from + (100 - from) * t);
      if (t < 1) {
        this.drawFrames.set(questionId, setTimeout(step, 16));
        return;
      }
      this.stopDraw(questionId);
      onDone();
    };
    this.drawFrames.set(questionId, setTimeout(step, 16));
  }

  private stopDraw(questionId: string): void {
    this.clearDrawFrame(questionId);
    this.drawProgress.update((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  }

  private clearDrawFrame(questionId: string): void {
    const frame = this.drawFrames.get(questionId);
    if (frame !== undefined) clearTimeout(frame);
    this.drawFrames.delete(questionId);
  }

  private setDraw(questionId: string, value: number): void {
    this.drawProgress.update((current) => ({ ...current, [questionId]: value }));
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
    for (const questionId of [...this.drawFrames.keys()]) this.stopDraw(questionId);
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

  /** Dejar la pregunta para mas tarde: pasa a la siguiente (o al resumen desde la ultima) sin responder. */
  skip(): void {
    this.cancelAutoAdvance();
    this.returnToSummary = false;
    this.goForward();
  }

  previous(): void {
    this.cancelAutoAdvance();
    this.returnToSummary = false;
    if (this.stepIndex() > 0) this.stepIndex.update((i) => i - 1);
  }

  goToQuestion(index: number): void {
    if (!this.editable() || index < 0 || index >= this.total()) return;
    this.cancelAutoAdvance();
    this.returnToSummary = this.view() === 'summary';
    this.stepIndex.set(index);
    this.view.set('question');
  }

  showSummary(): void {
    this.cancelAutoAdvance();
    this.returnToSummary = false;
    this.view.set('summary');
  }

  private goForward(): void {
    if (this.isLast()) {
      this.view.set('summary');
      return;
    }
    this.stepIndex.update((i) => i + 1);
  }

  /**
   * Avanza solo si se sigue en esa misma pregunta (si ya se salto o se volvio
   * atras mientras se guardaba, no se mueve nada). Desde "Cambiar" del resumen
   * se vuelve al resumen.
   */
  private advanceFrom(questionId: string): void {
    this.cancelAutoAdvance();
    if (this.view() !== 'question' || this.current()?.id !== questionId || !this.editable()) return;
    if (this.returnToSummary) {
      this.returnToSummary = false;
      this.view.set('summary');
      return;
    }
    this.goForward();
  }

  private scheduleAutoAdvance(questionId: string): void {
    this.cancelAutoAdvance();
    this.advanceTimer = setTimeout(() => {
      this.advanceTimer = null;
      this.advanceFrom(questionId);
    }, AUTO_ADVANCE_MS);
  }

  private cancelAutoAdvance(): void {
    if (this.advanceTimer !== null) {
      clearTimeout(this.advanceTimer);
      this.advanceTimer = null;
    }
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

  /** La opcion que se esta guardando ahora mismo (lleva el contorno animado), o null. */
  savingOption(question: QuizQuestion): QuizOptionCode | null {
    const state = this.saveStates()[question.id];
    return state?.status === 'saving' ? state.option : null;
  }

  /** Porcentaje dibujado del contorno de la opcion que se guarda (CSS --progress). */
  drawPercent(question: QuizQuestion): string {
    return (this.drawProgress()[question.id] ?? 0) + '%';
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
