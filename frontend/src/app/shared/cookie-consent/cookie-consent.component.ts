import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

declare function gtag(...args: unknown[]): void;

const STORAGE_KEY = 'quiniela.cookieConsent';
type ConsentChoice = 'accepted' | 'rejected';

/**
 * Banner de consentimiento de cookies para Google AdSense. El estado por
 * defecto (todo denegado) se declara en index.html, ANTES de cargar
 * adsbygoogle.js, siguiendo Google Consent Mode; este componente solo se
 * encarga de mostrar el aviso una vez y de llamar a gtag('consent','update')
 * con la eleccion del usuario.
 */
@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
})
export class CookieConsentComponent {
  readonly visible = signal(this.readStoredChoice() === null);

  accept(): void {
    this.applyChoice('accepted');
  }

  reject(): void {
    this.applyChoice('rejected');
  }

  private applyChoice(choice: ConsentChoice): void {
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      /* localStorage no disponible: el aviso volvera a salir la proxima vez, no es grave */
    }
    this.updateConsent(choice);
    this.visible.set(false);
  }

  private updateConsent(choice: ConsentChoice): void {
    const granted = choice === 'accepted';
    if (typeof gtag !== 'function') {
      return;
    }
    gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
    });
  }

  private readStoredChoice(): ConsentChoice | null {
    try {
      return localStorage.getItem(STORAGE_KEY) as ConsentChoice | null;
    } catch {
      return null;
    }
  }
}
