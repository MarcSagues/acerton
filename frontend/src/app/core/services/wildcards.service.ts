import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ComebackStatus } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class WildcardsService {
  constructor(private readonly http: HttpClient) {}

  /** matchdayId opcional: sin el, remaining = allowance (no hay usos ya gastados que descontar). */
  getComebackStatus(groupId: string, matchdayId?: string) {
    const params: Record<string, string> = {};
    if (matchdayId) {
      params['matchdayId'] = matchdayId;
    }
    return this.http.get<ComebackStatus>(
      `${environment.apiUrl}/groups/${groupId}/wildcards/comeback`,
      { params },
    );
  }
}
