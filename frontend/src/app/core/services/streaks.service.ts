import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Streak } from '../models/profile.model';

@Injectable({ providedIn: 'root' })
export class StreaksService {
  constructor(private readonly http: HttpClient) {}

  getForUserInGroup(groupId: string) {
    return this.http.get<Streak>(`${environment.apiUrl}/groups/${groupId}/streaks/me`);
  }
}
