import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProfileService } from './profile.service';

const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

/**
 * Notificaciones push via Firebase Cloud Messaging. El SDK y el service
 * worker de Firebase se cargan solo cuando el usuario activa las
 * notificaciones (import dinamico), para no pesar en el bundle inicial de
 * quien no las usa. El service worker de FCM se registra en un scope propio
 * para no chocar con el de Angular (ngsw-worker.js, que controla '/').
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly profileService = inject(ProfileService);
  private readonly snackBar = inject(MatSnackBar);

  readonly supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  readonly configured = !!environment.firebase.vapidKey;
  readonly permission = signal<NotificationPermission>(this.readPermission());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readPermission(): NotificationPermission {
    return this.supported ? Notification.permission : 'denied';
  }

  async enable(): Promise<boolean> {
    if (!this.supported) {
      this.error.set('Este navegador no soporta notificaciones push.');
      return false;
    }
    if (!this.configured) {
      this.error.set('Las notificaciones push no estan configuradas en este entorno.');
      return false;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const permission = await Notification.requestPermission();
      this.permission.set(permission);
      if (permission !== 'granted') {
        this.error.set('Has bloqueado los permisos de notificacion.');
        return false;
      }

      const [{ initializeApp }, { getMessaging, getToken, onMessage }] = await Promise.all([
        import('firebase/app'),
        import('firebase/messaging'),
      ]);

      const app = initializeApp(environment.firebase);
      const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js', {
        scope: SW_SCOPE,
      });
      const messaging = getMessaging(app);

      const token = await getToken(messaging, {
        vapidKey: environment.firebase.vapidKey,
        serviceWorkerRegistration: registration,
      });
      if (!token) {
        this.error.set('No se pudo obtener el token de notificaciones.');
        return false;
      }

      await firstValueFrom(this.profileService.registerNotificationToken(token));

      onMessage(messaging, (payload) => {
        const title = payload.notification?.title ?? 'Quiniela';
        const body = payload.notification?.body ?? '';
        this.snackBar.open(`${title}: ${body}`, 'Cerrar', { duration: 5000 });
      });

      return true;
    } catch {
      this.error.set('No se pudieron activar las notificaciones.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }
}
