import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CurrentMatchdayEntry, Matchday } from '../models/matchday.model';

@Injectable({ providedIn: 'root' })
export class MatchdaysService {
  constructor(private readonly http: HttpClient) {}

  getCurrentForGroup(groupId: string) {
    return this.http.get<CurrentMatchdayEntry[]>(
      `${environment.apiUrl}/groups/${groupId}/matchdays/current`,
    );
  }

  getById(matchdayId: string) {
    return this.http.get<Matchday>(`${environment.apiUrl}/matchdays/${matchdayId}`);
  }
}
