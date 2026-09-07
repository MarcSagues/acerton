import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { RankingPeriod, RankingRow } from '../models/ranking.model';

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
}
