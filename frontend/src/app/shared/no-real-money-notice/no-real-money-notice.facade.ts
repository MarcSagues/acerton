import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'acerton.noRealMoneyNotice.v1';

@Injectable()
export class NoRealMoneyNoticeFacade {
  readonly visible = signal(!this.wasDismissed());

  dismiss(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* localStorage no disponible: el aviso volvera a salir la proxima vez */
    }
    this.visible.set(false);
  }

  private wasDismissed(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
