import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { PlayerProfile } from '../models/player-profile.model';

/** Perfil general de cualquier jugador (el propio o el de otro). */
@Injectable({ providedIn: 'root' })
export class PlayerProfileService {
  private readonly http = inject(HttpClient);

  get(userId: string) {
    return this.http.get<PlayerProfile>(`${environment.apiUrl}/players/${encodeURIComponent(userId)}`);
  }
}
