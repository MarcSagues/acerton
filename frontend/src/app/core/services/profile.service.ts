import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/profile.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly http: HttpClient) {}

  getMyProfile() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/users/me/profile`);
  }

  updateName(name: string) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me/name`, { name });
  }

  registerNotificationToken(token: string) {
    return this.http.post(`${environment.apiUrl}/users/me/notification-tokens`, { token });
  }
}
