import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Prediction, SubmitPredictionPayload } from '../models/prediction.model';

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

  getGroupPredictionsForMatchday(groupId: string, matchdayId: string) {
    return this.http.get<Prediction[]>(
      `${environment.apiUrl}/groups/${groupId}/predictions/matchday/${matchdayId}`,
    );
  }
}
