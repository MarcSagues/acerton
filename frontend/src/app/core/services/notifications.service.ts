import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  constructor(private readonly http: HttpClient) {}

  /** Avisos reales del usuario para la pantalla "Avisos", mas recientes primero (ver NotificationsController.getMine). */
  getMine() {
    return this.http.get<AppNotification[]>(`${environment.apiUrl}/notifications/me`);
  }

  markAllRead() {
    return this.http.post<void>(`${environment.apiUrl}/notifications/me/read-all`, {});
  }

  markRead(id: string) {
    return this.http.post<void>(`${environment.apiUrl}/notifications/me/${id}/read`, {});
  }
}
