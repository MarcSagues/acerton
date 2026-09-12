import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationPreferences } from '../models/notification-preferences.model';

@Injectable({ providedIn: 'root' })
export class NotificationPreferencesService {
  constructor(private readonly http: HttpClient) {}

  get() {
    return this.http.get<NotificationPreferences>(`${environment.apiUrl}/users/me/notification-preferences`);
  }

  update(patch: Partial<Omit<NotificationPreferences, 'groups'>>) {
    return this.http.patch<NotificationPreferences>(
      `${environment.apiUrl}/users/me/notification-preferences`,
      patch,
    );
  }
}
