import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ClarityService } from '../../core/services/clarity.service';
import { ConsentChoice, readCookieConsent, storeCookieConsent } from './cookie-consent.storage';

declare function gtag(...args: unknown[]): void;

@Injectable()
export class CookieConsentFacade {
  private readonly clarity = inject(ClarityService);

  /**
   * En la app nativa no hay cookies de terceros que consentir (ver
   * index.html: AdSense/Google Consent Mode solo cargan en web, la app usa
   * AdMob con su propio flujo de ATT; Clarity tampoco carga ahi) — el banner
   * no debe aparecer (Guideline 5.1.2(i) de App Store: un banner de cookies
   * dentro de la app sin nada real detras solo confunde la revision).
   */
  readonly visible = signal(!Capacitor.isNativePlatform() && readCookieConsent() === null);

  accept(): void {
    this.applyChoice('accepted');
  }

  reject(): void {
    this.applyChoice('rejected');
  }

  private applyChoice(choice: ConsentChoice): void {
    storeCookieConsent(choice);
    this.updateConsent(choice);
    this.visible.set(false);
  }

  private updateConsent(choice: ConsentChoice): void {
    const granted = choice === 'accepted';
    // Clarity tambien escucha Google Consent Mode: analytics_storage tiene
    // que ir igual que lo que se le dice a Clarity, y Clarity va despues
    // para que su estado explicito sea siempre el ultimo que recibe.
    if (typeof gtag === 'function') {
      gtag('consent', 'update', {
        ad_storage: granted ? 'granted' : 'denied',
        ad_user_data: granted ? 'granted' : 'denied',
        ad_personalization: granted ? 'granted' : 'denied',
        analytics_storage: granted ? 'granted' : 'denied',
      });
    }
    this.clarity.setConsent(granted);
  }
}
