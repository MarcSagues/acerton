import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import Clarity from '@microsoft/clarity';
import { environment } from '../../../environments/environment';
import { readCookieConsent } from '../../shared/cookie-consent/cookie-consent.storage';

/**
 * Microsoft Clarity (mapas de calor y grabaciones de sesion), solo en web.
 *
 * - Sin `clarityProjectId` en el environment no hace nada: asi se puede
 *   desplegar el codigo antes de tener el proyecto creado en clarity.ms.
 * - No se carga en la app nativa, por lo mismo que AdSense (ver index.html):
 *   alli no hay aviso de cookies y un script de terceros dentro del WebView
 *   tendria que pasar por la revision de privacidad de App Store/Play.
 * - Consentimiento (obligatorio en UE/Reino Unido/Suiza desde oct. 2025):
 *   arranca en "denied" y solo pasa a "granted" para analitica si el usuario
 *   acepta en el aviso de cookies. Sin consentimiento Clarity funciona en
 *   modo limitado (sin cookies ni sesiones enlazadas). ad_Storage va siempre
 *   denegado: Clarity no se usa para publicidad.
 */
@Injectable({ providedIn: 'root' })
export class ClarityService {
  private initialized = false;

  init(): void {
    const projectId = environment.clarityProjectId;
    if (this.initialized || !projectId || Capacitor.isNativePlatform()) return;
    this.initialized = true;

    Clarity.init(projectId);
    this.setConsent(readCookieConsent() === 'accepted');
  }

  setConsent(granted: boolean): void {
    if (!this.initialized) return;
    Clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: granted ? 'granted' : 'denied' });
  }
}
