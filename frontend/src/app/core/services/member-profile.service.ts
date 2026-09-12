import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { MemberProfile } from '../models/member-profile.model';

@Injectable({ providedIn: 'root' })
export class MemberProfileService {
  constructor(private readonly http: HttpClient) {}

  getProfile(groupId: string, userId: string) {
    return this.http.get<MemberProfile>(`${environment.apiUrl}/groups/${groupId}/members/${userId}/profile`);
  }
}
