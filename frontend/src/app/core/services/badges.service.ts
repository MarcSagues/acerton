import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Badge } from '../models/profile.model';
import { BadgeProgress } from '../models/badge-progress.model';

@Injectable({ providedIn: 'root' })
export class BadgesService {
  constructor(private readonly http: HttpClient) {}

  getCatalog() {
    return this.http.get<Badge[]>(`${environment.apiUrl}/badges/catalog`);
  }

  /** % de usuarios que tienen cada insignia, indexado por code. */
  getStats() {
    return this.http.get<Record<string, number>>(`${environment.apiUrl}/badges/stats`);
  }

  /** Progreso hacia cada insignia medible (solo las que se acumulan hacia un numero), indexado por code. */
  getProgress() {
    return this.http.get<Record<string, BadgeProgress>>(`${environment.apiUrl}/badges/me/progress`);
  }
}
