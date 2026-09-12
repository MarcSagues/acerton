import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Barra "Listo" sobre el teclado en iOS nativo: el teclado numerico
 * (marcadores de resultado exacto, etc.) no trae una tecla de retorno
 * propia del sistema para cerrarlo, y con Keyboard.resize:'none' (ver
 * capacitor.config.ts) tampoco se puede confiar en que aparezca solo al
 * reducirse el WebView. Se muestra fija encima del teclado mientras haya
 * un campo enfocado, en cualquier pantalla, y solo le quita el foco (el
 * cierre del teclado lo dispara el propio sistema al perder el foco el
 * campo).
 */
@Component({
  selector: 'app-keyboard-accessory',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="keyboard-accessory" [style.bottom.px]="height()">
        <button type="button" (click)="dismiss()">Listo</button>
      </div>
    }
  `,
  styles: [
    `
      .keyboard-accessory {
        position: fixed;
        left: 0;
        right: 0;
        z-index: 10000;
        display: flex;
        justify-content: flex-end;
        padding: 6px 12px;
        background: var(--p4-surface-2, #1c2126);
        border-top: 1px solid var(--p4-border, rgba(255, 255, 255, 0.1));
      }
      button {
        min-height: 32px;
        padding: 0 14px;
        border-radius: 8px;
        border: 0;
        background: none;
        color: var(--p4-accent, #d2be94);
        font: 600 15px/1 var(--p4-font-ui, system-ui);
      }
    `,
  ],
})
export class KeyboardAccessoryComponent implements OnInit, OnDestroy {
  readonly visible = signal(false);
  readonly height = signal(0);

  private showHandle?: { remove: () => void };
  private hideHandle?: { remove: () => void };

  ngOnInit(): void {
    if (!Capacitor.isNativePlatform()) return;
    Keyboard.addListener('keyboardWillShow', (info) => {
      this.height.set(info.keyboardHeight);
      this.visible.set(true);
    }).then((handle) => (this.showHandle = handle));
    Keyboard.addListener('keyboardWillHide', () => {
      this.visible.set(false);
    }).then((handle) => (this.hideHandle = handle));
  }

  ngOnDestroy(): void {
    this.showHandle?.remove();
    this.hideHandle?.remove();
  }

  dismiss(): void {
    (document.activeElement as HTMLElement | null)?.blur();
  }
}
