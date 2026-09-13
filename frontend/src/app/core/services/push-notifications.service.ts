import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Dialog } from '@capacitor/dialog';
import { environment } from '../../../environments/environment';
import { ProfileService } from './profile.service';

export interface TestBroadcastResult {
  userCount: number;
  tokenCount: number;
  successCount: number;
  failureCount: number;
}

interface FcmTokenPluginInterface {
  getToken(): Promise<{ token: string }>;
}

/**
 * Plugin nativo propio (frontend/ios/App/App/FcmTokenPlugin.swift), sin
 * equivalente en Android: @capacitor/push-notifications ya da un token de
 * FCM valido ahi (Android usa FCM nativamente), pero en iOS solo da el
 * token crudo de APNs, que firebase-admin/sendEachForMulticast no acepta.
 * Este plugin expone el token que FirebaseMessaging traduce a partir del de
 * APNs (ver AppDelegate.swift).
 */
const FcmTokenPlugin = registerPlugin<FcmTokenPluginInterface>('FcmTokenPlugin');

const SW_SCOPE = '/firebase-cloud-messaging-push-scope';

/**
 * Notificaciones push. En web via Firebase Cloud Messaging (SDK y service
 * worker cargados solo al activar, para no pesar en el bundle de quien no
 * las usa). En la app nativa (Capacitor) via @capacitor/push-notifications,
 * que envuelve FCM nativo en Android y APNs en iOS directamente — el token
 * que devuelve se manda al mismo endpoint que en web
 * (ProfileService.registerNotificationToken), ya que el backend solo
 * necesita un token de FCM valido para enviar, le de igual si vino de un
 * navegador o de una app nativa.
 */
@Injectable({ providedIn: 'root' })
export class PushNotificationsService {
  private readonly profileService = inject(ProfileService);
  private readonly http = inject(HttpClient);
  private readonly snackBar = inject(MatSnackBar);
  private readonly isNative = Capacitor.isNativePlatform();

  readonly supported =
    this.isNative || (typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator);
  readonly configured = this.isNative || !!environment.firebase.vapidKey;
  readonly permission = signal<NotificationPermission>(this.readPermission());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /**
   * Distinto de `permission`: el permiso del sistema puede concederse y aun
   * asi fallar el paso siguiente (token nunca llega, o el POST al backend
   * falla) sin que quede ningun rastro visible — de ahi que "Activadas en
   * este dispositivo" antes se mostrara aunque no hubiera token real
   * guardado. Solo se pone a true tras confirmar el registro en el backend.
   */
  readonly registered = signal(false);

  private readPermission(): NotificationPermission {
    if (this.isNative) return 'default'; // se resuelve al llamar a enable(); no hay forma de consultarlo sin pedirlo
    return this.supported ? Notification.permission : 'denied';
  }

  async enable(): Promise<boolean> {
    if (!this.supported) {
      this.error.set('Este dispositivo no soporta notificaciones push.');
      return false;
    }
    if (!this.configured) {
      this.error.set('Las notificaciones push no están configuradas en este entorno.');
      return false;
    }

    this.loading.set(true);
    this.error.set(null);
    this.registered.set(false);

    try {
      return this.isNative ? await this.enableNative() : await this.enableWeb();
    } catch (error) {
      // Sin este log, un fallo real (VAPID invalido, service worker que no
      // registra, getToken() rechazado) quedaba indistinguible de "el
      // usuario nunca lo activo" — el unico sintoma visible era "no me
      // llegan notificaciones", sin ninguna pista de por que.
      console.error('[PushNotifications] enable() failed', error);
      this.error.set('No se pudieron activar las notificaciones.');
      return false;
    } finally {
      this.loading.set(false);
    }
  }

  private async enableNative(): Promise<boolean> {
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') {
      this.permission.set('denied');
      this.error.set('Has bloqueado los permisos de notificación.');
      return false;
    }
    this.permission.set('granted');

    return new Promise<boolean>((resolve) => {
      const registerToken = (token: string) => {
        this.profileService.registerNotificationToken(token).subscribe({
          next: () => {
            this.registered.set(true);
            resolve(true);
          },
          error: (httpError) => {
            // Sin esto, un token obtenido bien pero rechazado por el
            // backend (401, 500, red) quedaba tan silencioso como el resto:
            // permission ya estaba en 'granted' y nada avisaba del fallo.
            console.error('[PushNotifications] registerNotificationToken failed', httpError);
            this.error.set('Se obtuvo el token pero no se pudo guardar en el servidor.');
            resolve(false);
          },
        });
      };

      if (Capacitor.getPlatform() === 'ios') {
        // En iOS, @capacitor/push-notifications solo entrega el token crudo
        // de APNs (ver comentario junto a FcmTokenPlugin más arriba); el
        // token de FCM que el backend necesita sale de ahí en su lugar.
        FcmTokenPlugin.getToken().then(
          (result) => registerToken(result.token),
          () => {
            this.error.set('No se pudo obtener el token de notificaciones.');
            resolve(false);
          },
        );
      } else {
        PushNotifications.addListener('registration', (token) => registerToken(token.value));
      }
      PushNotifications.addListener('registrationError', () => {
        this.error.set('No se pudo obtener el token de notificaciones.');
        resolve(false);
      });
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const title = notification.title ?? 'Piqo';
        const body = notification.body ?? '';
        // Alerta nativa centrada en vez del banner del sistema (desactivado
        // en capacitor.config.ts) para que no compita con el nuestro.
        void Dialog.alert({ title, message: body });
      });
      PushNotifications.register();
    });
  }

  private async enableWeb(): Promise<boolean> {
    const permission = await Notification.requestPermission();
    this.permission.set(permission);
    if (permission !== 'granted') {
      this.error.set('Has bloqueado los permisos de notificación.');
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
    this.registered.set(true);

    onMessage(messaging, (payload) => {
      const title = payload.notification?.title ?? 'Piqo';
      const body = payload.notification?.body ?? '';
      this.snackBar.open(`${title}: ${body}`, 'Cerrar', { duration: 5000 });
    });

    return true;
  }

  /** Boton "Probar notificaciones" en Ajustes: manda un push real a todos los tokens registrados. */
  sendTestBroadcast() {
    return this.http.post<TestBroadcastResult>(`${environment.apiUrl}/notifications/test-broadcast`, {});
  }
}
