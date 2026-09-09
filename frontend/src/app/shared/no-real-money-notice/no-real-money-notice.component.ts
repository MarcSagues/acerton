import { Component, signal } from '@angular/core';

const STORAGE_KEY = 'acerton.noRealMoneyNotice.v1';

/**
 * Aviso modal, mostrado una vez por dispositivo, de que Acerton no implica
 * dinero real: ni apuestas, ni premios en metalico, ni pago por participar.
 * Se monta globalmente (ver app.component.html) para que aparezca sobre
 * cualquier pantalla nada mas abrir la app, incluida la landing publica que
 * ve App Review sin haber iniciado sesion.
 */
@Component({
  selector: 'app-no-real-money-notice',
  standalone: true,
  templateUrl: './no-real-money-notice.component.html',
  styleUrl: './no-real-money-notice.component.scss',
})
export class NoRealMoneyNoticeComponent {
  readonly visible = signal(!this.wasDismissed());

  dismiss(): void {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* localStorage no disponible: el aviso volvera a salir la proxima vez, no es grave */
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
