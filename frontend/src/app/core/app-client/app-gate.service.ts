import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { appClientInfo, compareVersions } from './app-client';

export type AppGateState = 'open' | 'update' | 'maintenance';

interface AppConfigResponse {
  minVersion: { ios: string | null; android: string | null };
  storeUrl: { ios: string; android: string };
}

/**
 * Pantallas que bloquean la app (ver AppGateComponent):
 * - `update`: la app nativa es mas antigua que la version minima del backend
 *   (GET /app-config). Se mira al arrancar y al volver a primer plano.
 * - `maintenance`: el backend contesta 503 con `maintenance: true` (ver
 *   appClientInterceptor).
 * Si /app-config falla (sin red, backend caido) se deja entrar: un fallo aqui
 * no puede dejar a todo el mundo fuera.
 */
@Injectable({ providedIn: 'root' })
export class AppGateService {
  private readonly http = inject(HttpClient);
  private readonly stateSignal = signal<AppGateState>('open');
  private storeUrl: string | null = null;

  readonly state = this.stateSignal.asReadonly();

  init(): void {
    if (!Capacitor.isNativePlatform()) return;
    void this.checkMinVersion();
    void App.addListener('resume', () => void this.checkMinVersion());
  }

  enterMaintenance(): void {
    if (this.stateSignal() === 'open') this.stateSignal.set('maintenance');
  }

  openStore(): void {
    if (this.storeUrl) window.open(this.storeUrl, '_system');
  }

  /** Vuelve a arrancar la app: si el mantenimiento sigue, la primera peticion lo volvera a enseñar. */
  retry(): void {
    window.location.reload();
  }

  private async checkMinVersion(): Promise<void> {
    try {
      const [client, config] = await Promise.all([
        appClientInfo(),
        firstValueFrom(this.http.get<AppConfigResponse>(`${environment.apiUrl}/app-config`)),
      ]);
      if (client.platform === 'web') return;
      const minVersion = config.minVersion[client.platform];
      this.storeUrl = config.storeUrl[client.platform];
      if (minVersion && compareVersions(client.version, minVersion) < 0) {
        this.stateSignal.set('update');
      } else if (this.stateSignal() === 'update') {
        this.stateSignal.set('open');
      }
    } catch {
      /* Sin respuesta: se deja entrar (ver comentario de la clase). */
    }
  }
}
