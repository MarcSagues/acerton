import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { GroupSeason } from '../models/season.model';

@Injectable({ providedIn: 'root' })
export class SeasonsService {
  constructor(private readonly http: HttpClient) {}

  /** La abierta primero (o unica) — ver SeasonsController. Vacio si el grupo todavia no ha puntuado ninguna jornada. */
  listSeasons(groupId: string) {
    return this.http.get<GroupSeason[]>(`${environment.apiUrl}/groups/${groupId}/seasons`);
  }
}
