import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CompetitionHistory, ExactScoreLeader, RankingPeriod, RankingRow } from '../models/ranking.model';

@Injectable({ providedIn: 'root' })
export class RankingsService {
  constructor(private readonly http: HttpClient) {}

  getRanking(groupId: string, period: RankingPeriod, scope: string) {
    return this.http.get<RankingRow[]>(`${environment.apiUrl}/groups/${groupId}/rankings`, {
      params: { period, scope },
    });
  }

  getRankingForMatchday(groupId: string, period: RankingPeriod, competitionId: string | null, matchdayId: string) {
    return this.http.get<RankingRow[]>(`${environment.apiUrl}/groups/${groupId}/rankings`, {
      params: { period, scope: competitionId ?? 'general', matchdayId },
    });
  }

  /** Marcadores exactos de cada jugador en la misma vista que la clasificacion (jornada elegida, ultima o acumulado). */
  getExactScoreLeaders(groupId: string, period: RankingPeriod, scope: string, matchdayId: string | null) {
    const params: Record<string, string> = { period, scope };
    if (matchdayId) params['matchdayId'] = matchdayId;
    return this.http.get<ExactScoreLeader[]>(`${environment.apiUrl}/groups/${groupId}/rankings/exact-scores`, { params });
  }

  getHistory(groupId: string, competitionId: string) {
    return this.http.get<CompetitionHistory>(`${environment.apiUrl}/groups/${groupId}/rankings/history`, {
      params: { competitionId },
    });
  }
}
