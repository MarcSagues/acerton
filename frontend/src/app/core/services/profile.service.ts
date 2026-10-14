import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { UserProfile } from '../models/profile.model';
import { User } from '../models/user.model';
import { AvatarCatalog } from '../models/avatar-catalog.model';
import { TeamCatalog } from '../models/favorite-team.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private readonly http: HttpClient) {}

  getMyProfile() {
    return this.http.get<UserProfile>(`${environment.apiUrl}/users/me/profile`);
  }

  updateName(name: string) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me/name`, { name });
  }

  getAvatarCatalog() {
    return this.http.get<AvatarCatalog>(`${environment.apiUrl}/users/me/avatar-catalog`);
  }

  updateAvatar(mascotId: string, background: string) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me/avatar`, { mascotId, background });
  }

  getTeamCatalog() {
    return this.http.get<TeamCatalog>(`${environment.apiUrl}/users/me/team-catalog`);
  }

  /** `null` quita el equipo favorito. */
  updateFavoriteTeam(team: string | null) {
    return this.http.patch<User>(`${environment.apiUrl}/users/me/favorite-team`, { team });
  }

  completeTutorial() {
    return this.http.patch<User>(`${environment.apiUrl}/users/me/tutorial-completed`, {});
  }

  registerNotificationToken(token: string) {
    return this.http.post(`${environment.apiUrl}/users/me/notification-tokens`, { token });
  }
}
