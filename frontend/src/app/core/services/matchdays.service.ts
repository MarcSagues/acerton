import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, switchMap, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentMatchdayEntry, Matchday, MatchdaySummary } from '../models/matchday.model';

const LOCKED_STATUSES = ['CLOSED', 'FINISHED'];

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

  /** null cuando no hay jornada anterior/siguiente (todavia). */
  getAdjacent(matchdayId: string, direction: 'previous' | 'next') {
    return this.http.get<Matchday | null>(`${environment.apiUrl}/matchdays/${matchdayId}/adjacent`, {
      params: { direction },
    });
  }

  /**
   * Jornada cerrada/finalizada mas reciente de una competicion dentro de un
   * grupo: la "en vivo" si ya cerro, o la anterior si todavia esta abierta.
   * Usado para poder ver las quinielas de otro miembro (nunca se muestra una
   * jornada sin cerrar, ver getGroupPredictionsForMatchday en el backend).
   */
  /** Jornadas ya guardadas de una competicion, con los puntos del usuario actual en cada una (null si no pronostico). */
  listForCompetition(groupId: string, competitionId: string) {
    return this.http.get<MatchdaySummary[]>(
      `${environment.apiUrl}/groups/${groupId}/competitions/${competitionId}/matchdays`,
    );
  }

  getLatestLockedMatchday(groupId: string, competitionId: string) {
    return this.getCurrentForGroup(groupId).pipe(
      switchMap((entries) => {
        const entry = entries.find((e) => e.competition.id === competitionId);
        if (!entry) return of(null);
        if (LOCKED_STATUSES.includes(entry.matchday.status)) return of(entry.matchday);
        return this.getAdjacent(entry.matchday.id, 'previous');
      }),
      map((matchday) => (matchday && LOCKED_STATUSES.includes(matchday.status) ? matchday : null)),
    );
  }
}
