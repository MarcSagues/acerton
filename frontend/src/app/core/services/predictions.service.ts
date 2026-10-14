import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { CopyResult, CopySource, Prediction, SubmitPredictionPayload } from '../models/prediction.model';

@Injectable({ providedIn: 'root' })
export class PredictionsService {
  constructor(private readonly http: HttpClient) {}

  submit(groupId: string, payload: SubmitPredictionPayload) {
    return this.http.post<Prediction>(`${environment.apiUrl}/groups/${groupId}/predictions`, payload);
  }

  getMine(groupId: string, matchdayId: string) {
    return this.http.get<Prediction[]>(
      `${environment.apiUrl}/groups/${groupId}/predictions/mine/${matchdayId}`,
    );
  }

  /** Otros grupos del usuario con pronosticos abiertos de esa jornada, para "copiar de otro grupo". */
  getCopySources(groupId: string, matchdayId: string) {
    return this.http.get<CopySource[]>(
      `${environment.apiUrl}/groups/${groupId}/predictions/copy-sources/${matchdayId}`,
    );
  }

  /** Copia a `groupId` los pronosticos de esa jornada ya hechos en `sourceGroupId`. */
  copyFrom(groupId: string, sourceGroupId: string, matchdayId: string) {
    return this.http.post<CopyResult>(
      `${environment.apiUrl}/groups/${groupId}/predictions/copy-from/${sourceGroupId}`,
      { matchdayId },
    );
  }

  getGroupPredictionsForMatchday(groupId: string, matchdayId: string) {
    return this.http.get<Prediction[]>(
      `${environment.apiUrl}/groups/${groupId}/predictions/matchday/${matchdayId}`,
    );
  }
}
