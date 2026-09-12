import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PublicGroupPreview, PublicGroupsPage } from '../models/public-group.model';
import { ScoringMode } from '../models/group.model';

export interface PublicGroupSearchParams {
  q?: string;
  scoringMode?: ScoringMode;
  competitionIds?: string[];
  cursor?: string;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class PublicGroupsService {
  constructor(private readonly http: HttpClient) {}

  search(params: PublicGroupSearchParams) {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.scoringMode) httpParams = httpParams.set('scoringMode', params.scoringMode);
    if (params.competitionIds && params.competitionIds.length > 0) {
      httpParams = httpParams.set('competitionIds', params.competitionIds.join(','));
    }
    if (params.cursor) httpParams = httpParams.set('cursor', params.cursor);
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<PublicGroupsPage>(`${environment.apiUrl}/groups/public`, { params: httpParams });
  }

  preview(groupId: string) {
    return this.http.get<PublicGroupPreview>(`${environment.apiUrl}/groups/public/${groupId}/preview`);
  }
}
