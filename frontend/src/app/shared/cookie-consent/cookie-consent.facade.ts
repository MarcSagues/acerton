import { Injectable, signal } from '@angular/core';

declare function gtag(...args: unknown[]): void;

const STORAGE_KEY = 'quiniela.cookieConsent';
type ConsentChoice = 'accepted' | 'rejected';

@Injectable()
export class CookieConsentFacade {
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
      /* localStorage no disponible: el aviso volvera a salir la proxima vez */
    }
    this.updateConsent(choice);
    this.visible.set(false);
  }

  private updateConsent(choice: ConsentChoice): void {
    const granted = choice === 'accepted';
    if (typeof gtag !== 'function') return;
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
