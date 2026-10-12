import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { QuizAnswerInput, QuizDetail, QuizOverview, QuizRanking, QuizRankingQuery } from '../models/quiz.model';

/**
 * Cliente del Quiz de jornada (contrato v1, docs/quiniela/quiz-jornada-plan.md §6).
 * El usuario sale de la sesion: nunca se envia userId ni groupId.
 */
@Injectable({ providedIn: 'root' })
export class QuizService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/quiz`;

  getOverview() {
    return this.http.get<QuizOverview>(`${this.base}/overview`);
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
    return this.http.post<QuizDetail>(`${this.base}/${encodeURIComponent(quizId)}/complete`, {});
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
