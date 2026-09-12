import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

/**
 * Universal Links (iOS) / App Links (Android): cuando el sistema abre la
 * app a partir de https://acerton.app/... (enlace de confirmacion de
 * correo, recuperacion de contrasena, invitacion a grupo), Capacitor
 * entrega la URL completa via el evento "appUrlOpen" en vez de navegar el
 * WebView el solo. Aqui se extrae la ruta (path + query) y se navega con
 * el Router de Angular, tanto si la app ya estaba abierta como si el
 * enlace fue lo que la arranco (Capacitor encola ese primer evento hasta
 * que se registra el listener, ver getLaunchUrl como respaldo por si no).
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private readonly router = inject(Router);

  init(): void {
    if (!Capacitor.isNativePlatform()) return;

    App.addListener('appUrlOpen', ({ url }) => this.navigateFromUrl(url));
    App.getLaunchUrl()
      .then((result) => {
        if (result?.url) this.navigateFromUrl(result.url);
      })
      .catch(() => undefined);
  }

  private navigateFromUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return;
    }
    this.router.navigateByUrl(`${parsed.pathname}${parsed.search}`);
  }
}
