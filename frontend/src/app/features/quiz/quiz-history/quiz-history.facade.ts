import { Injectable, computed, inject, signal } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { QuizService } from '../../../core/services/quiz.service';
import { QuizHistory, QuizHistoryEntry, QuizMatch, QuizQuestion } from '../../../core/models/quiz.model';
import { optionLabel, outcomeLabel, questionOutcome, questionText, teamName, QuestionOutcome } from '../domain/quiz-rules';

export interface QuizHistoryTotals {
  quizzes: number;
  hits: number;
  misses: number;
}

/** Historial de quizzes de un jugador (el propio o el de quien se visita): lo respondido y si acerto. */
@Injectable()
export class QuizHistoryFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly auth = inject(AuthService);
  private readonly quizService = inject(QuizService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly history = signal<QuizHistory | null>(null);
  /** Quiz desplegado: el mas reciente al abrir. */
  readonly expandedId = signal<string | null>(null);

  /** Liga elegida para filtrar, o null para todas. */
  readonly competitionFilter = signal<string | null>(null);

  readonly isMe = computed(() => this.history()?.userId === this.auth.currentUser()?.id);
  private readonly allQuizzes = computed(() => this.history()?.quizzes ?? []);
  /** Las ligas en las que ha jugado, en el orden en que aparecen (de la mas reciente). */
  readonly competitions = computed(() => {
    const seen = new Map<string, string>();
    for (const quiz of this.allQuizzes()) if (!seen.has(quiz.competition.id)) seen.set(quiz.competition.id, quiz.competition.name);
    return [...seen].map(([id, name]) => ({ id, name }));
  });
  readonly quizzes = computed(() => {
    const filter = this.competitionFilter();
    return filter ? this.allQuizzes().filter((quiz) => quiz.competition.id === filter) : this.allQuizzes();
  });

  readonly totals = computed<QuizHistoryTotals>(() => {
    let hits = 0;
    let misses = 0;
    for (const quiz of this.quizzes()) {
      const stats = this.stats(quiz);
      hits += stats.hits;
      misses += stats.misses;
    }
    return { quizzes: this.quizzes().length, hits, misses };
  });

  init(): void {
    const userId = this.route.snapshot.paramMap.get('userId');
    if (!userId) {
      this.loading.set(false);
      this.error.set(true);
      return;
    }
    this.loading.set(true);
    this.error.set(false);
    this.quizService.getHistory(userId).subscribe({
      next: (history) => {
        this.history.set(history);
        this.competitionFilter.set(null);
        this.expandedId.set(history.quizzes[0]?.quizId ?? null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  /** Aciertos y fallos de un quiz (las pendientes y anuladas no cuentan en ninguno). */
  stats(quiz: QuizHistoryEntry): { hits: number; misses: number } {
    let hits = 0;
    let misses = 0;
    for (const question of quiz.questions) {
      const outcome = questionOutcome(question);
      if (outcome === 'hit') hits++;
      else if (outcome === 'miss') misses++;
    }
    return { hits, misses };
  }

  /** Filtra por liga (null = todas); el quiz mas reciente de lo filtrado queda desplegado. */
  selectCompetition(competitionId: string | null): void {
    this.competitionFilter.set(competitionId);
    this.expandedId.set(this.quizzes()[0]?.quizId ?? null);
  }

  toggle(quizId: string): void {
    this.expandedId.update((current) => (current === quizId ? null : quizId));
  }

  isExpanded(quizId: string): boolean {
    return this.expandedId() === quizId;
  }

  outcome(question: QuizQuestion): QuestionOutcome {
    return questionOutcome(question);
  }

  outcomeLabel(question: QuizQuestion): string {
    return outcomeLabel(questionOutcome(question));
  }

  questionText(question: QuizQuestion): string {
    return questionText(question);
  }

  team(match: QuizMatch, side: 'home' | 'away'): string {
    return teamName(match, side);
  }

  optionLabel(question: QuizQuestion, option: NonNullable<QuizQuestion['selectedOption']>): string {
    return optionLabel(option, question.match);
  }

  goBack(): void {
    if (window.history.length > 1) this.location.back();
    else void this.router.navigate(['/profile']);
  }
}
