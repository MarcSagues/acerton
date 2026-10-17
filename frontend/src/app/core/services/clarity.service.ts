import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import Clarity from '@microsoft/clarity';
import { environment } from '../../../environments/environment';
import { readCookieConsent } from '../../shared/cookie-consent/cookie-consent.storage';

/**
 * Microsoft Clarity (mapas de calor y grabaciones de sesion), en web y en la
 * app de iOS. La app de iOS es la misma web dentro de un WKWebView servida
 * como https://app.piqo.es (ver capacitor.config.ts), asi que el script web
 * de Clarity la graba igual, sin SDK nativo. En Android no se carga.
 *
 * - Sin `clarityProjectId` en el environment no hace nada.
 * - Consentimiento (obligatorio en UE/Reino Unido/Suiza desde oct. 2025):
 *   ad_Storage va siempre denegado (Clarity no se usa para publicidad).
 *   analytics_Storage:
 *   - web: "granted" solo si el usuario acepta el aviso de cookies.
 *   - iOS: siempre "denied". En la app no hay aviso de cookies (ver
 *     CookieConsentFacade), asi que Clarity funciona en su modo sin cookies:
 *     no guarda nada en el dispositivo ni relaciona visitas, y por tanto no
 *     es "tracking" a efectos de App Tracking Transparency.
 * - Etiqueta `platform` (web/ios) para poder filtrar en clarity.microsoft.com.
 */
@Injectable({ providedIn: 'root' })
export class ClarityService {
  private initialized = false;

  init(): void {
    const projectId = environment.clarityProjectId;
    const platform = Capacitor.getPlatform();
    if (this.initialized || !projectId || platform === 'android') return;
    this.initialized = true;

    Clarity.init(projectId);
    Clarity.setTag('platform', platform);
    this.setConsent(platform === 'web' && readCookieConsent() === 'accepted');
  }

  setConsent(granted: boolean): void {
    if (!this.initialized) return;
    Clarity.consentV2({ ad_Storage: 'denied', analytics_Storage: granted ? 'granted' : 'denied' });
  }
}
