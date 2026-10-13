import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QuizAnswerInput, QuizDetail, QuizHistory, QuizOverview, QuizRanking, QuizRankingQuery } from '../models/quiz.model';

/**
 * Cliente del Quiz de jornada (contrato v1, docs/quiniela/quiz-jornada-plan.md §6).
 * El usuario sale de la sesion: nunca se envia userId ni groupId.
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/quiz`;

  /**
   * Ultimo resumen recibido, lo pida quien lo pida (el centro del Quiz o la
   * barra inferior): de aqui sale el punto rojo de "Quiz" en la barra.
   */
  private readonly lastOverviewSignal = signal<QuizOverview | null>(null);
  readonly lastOverview = this.lastOverviewSignal.asReadonly();
  private lastRefreshAt = 0;

  getOverview() {
    return this.http.get<QuizOverview>(`${this.base}/overview`).pipe(tap((overview) => this.lastOverviewSignal.set(overview)));
  }

  /** Vuelve a pedir el resumen solo para el punto de la barra; si falla, se queda el ultimo conocido. */
  refreshOverview(): void {
    this.lastRefreshAt = Date.now();
    this.getOverview().subscribe({ error: () => undefined });
  }

  /** Como refreshOverview, pero como mucho una vez cada `maxAgeMs` (la barra lo llama en cada navegacion). */
  refreshOverviewIfStale(maxAgeMs: number): void {
    if (Date.now() - this.lastRefreshAt < maxAgeMs) return;
    this.refreshOverview();
  }

  getQuiz(quizId: string) {
    return this.http.get<QuizDetail>(`${this.base}/${encodeURIComponent(quizId)}`);
  }

  /** Idempotente: si ya habia participacion, devuelve la misma. */
  start(quizId: string) {
    return this.http.post<QuizDetail>(`${this.base}/${encodeURIComponent(quizId)}/participation`, {});
  }

  saveAnswers(quizId: string, answers: QuizAnswerInput[]) {
    return this.http.put<QuizDetail>(`${this.base}/${encodeURIComponent(quizId)}/answers`, { answers });
  }

  complete(quizId: string) {
    // Al terminar, el punto rojo de la barra tiene que apagarse sin esperar a otra navegacion.
    return this.http
      .post<QuizDetail>(`${this.base}/${encodeURIComponent(quizId)}/complete`, {})
      .pipe(tap(() => this.refreshOverview()));
  }

  /** Historial de quizzes cerrados de un jugador: el propio o el de alguien con quien se comparte grupo. */
  getHistory(userId: string) {
    return this.http.get<QuizHistory>(`${this.base}/history/${encodeURIComponent(userId)}`);
  }

  getRanking(query: QuizRankingQuery = {}) {
    let params = new HttpParams();
    if (query.competitionId) params = params.set('competitionId', query.competitionId);
    if (query.seasonLabel) params = params.set('seasonLabel', query.seasonLabel);
    if (query.cursor) params = params.set('cursor', query.cursor);
    if (query.limit) params = params.set('limit', String(query.limit));
    return this.http.get<QuizRanking>(`${this.base}/rankings`, { params });
  }
}
