import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';

/** Alto de la barra "Listo" que se pone encima del teclado (ver KeyboardAccessoryComponent). */
const ACCESSORY_HEIGHT_PX = 48;
/** Aire entre el campo y la barra "Listo" cuando se desplaza la pagina para dejarlo a la vista. */
const REVEAL_MARGIN_PX = 16;

/**
 * Elemento que de verdad hace scroll por encima de `field`. En esta app no es
 * la ventana: html y body llevan overflow-x:hidden (ver styles.scss), lo que
 * hace que el scroll vertical lo haga <body> (height:100%) por dentro, asi
 * que window.scrollBy no movia nada.
 */
function scrollContainerOf(field: HTMLElement): HTMLElement {
  for (let node = field.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

/** Cuanto hay que desplazar la pagina hacia abajo para que el borde inferior del campo quede, con margen, por encima de `visibleBottom`; 0 si ya se ve. */
export function scrollDeltaToReveal(elementBottom: number, visibleBottom: number, margin = REVEAL_MARGIN_PX): number {
  const hidden = elementBottom + margin - visibleBottom;
  return hidden > 0 ? Math.ceil(hidden) : 0;
}

/**
 * En iOS, con Keyboard.resize:'none' (ver capacitor.config.ts) el teclado se
 * superpone al WebView sin encogerlo ni mover nada, y el ultimo campo de una
 * pantalla larga (el marcador del ultimo partido en Jornada, modo resultado
 * exacto) quedaba tapado: no hay mas pagina por la que desplazarse. Mientras el
 * teclado esta abierto, esto:
 *  - deja debajo del contenido un hueco del alto del teclado, de la barra
 *    "Listo" y del margen (variable CSS --keyboard-inset, ver styles.scss), para que la
 *    pagina pueda subir lo necesario;
 *  - sube la pagina lo justo para que el campo con el foco quede encima del
 *    teclado, tanto al abrirlo como al pasar de un campo a otro con el teclado
 *    ya abierto.
 * Solo iOS: en Android el WebView si se redimensiona y el navegador ya lo hace.
 */
@Injectable({ providedIn: 'root' })
export class KeyboardInsetService {
  private keyboardHeight = 0;

  init(): void {
    if (Capacitor.getPlatform() !== 'ios') return;
    Keyboard.addListener('keyboardWillShow', (info) => this.show(info.keyboardHeight));
    Keyboard.addListener('keyboardWillHide', () => this.hide());
    document.addEventListener('focusin', () => {
      if (this.keyboardHeight > 0) this.revealFocusedField();
    });
  }

  /** El teclado se abre (o cambia de alto). */
  show(keyboardHeight: number): void {
    this.keyboardHeight = keyboardHeight;
    const root = document.documentElement;
    // Con el margen incluido, para que haya pagina suficiente por la que subir hasta dejar el campo con su aire.
    root.style.setProperty('--keyboard-inset', `${keyboardHeight + ACCESSORY_HEIGHT_PX + REVEAL_MARGIN_PX}px`);
    root.classList.add('keyboard-open');
    // Dos pasadas: la primera en cuanto el hueco ya esta puesto, la segunda
    // cuando termina la animacion del teclado y la medida es la definitiva.
    setTimeout(() => this.revealFocusedField(), 60);
    setTimeout(() => this.revealFocusedField(), 350);
  }

  hide(): void {
    this.keyboardHeight = 0;
    const root = document.documentElement;
    root.classList.remove('keyboard-open');
    root.style.removeProperty('--keyboard-inset');
  }

  /** Sube la pagina lo justo para que el campo enfocado quede a la vista por encima del teclado. */
  revealFocusedField(): void {
    const field = document.activeElement;
    if (this.keyboardHeight === 0 || !(field instanceof HTMLElement) || !field.matches('input, textarea, select, [contenteditable]')) return;

    // Con el WebView sin encoger, el teclado tapa la parte de abajo del viewport; si ya se hubiera encogido, solo falta la barra "Listo".
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const alreadyShrunk = viewportHeight < window.innerHeight - 80;
    const visibleBottom = alreadyShrunk ? viewportHeight - ACCESSORY_HEIGHT_PX : window.innerHeight - this.keyboardHeight - ACCESSORY_HEIGHT_PX;

    const delta = scrollDeltaToReveal(field.getBoundingClientRect().bottom, visibleBottom);
    if (delta > 0) scrollContainerOf(field).scrollBy({ top: delta, behavior: 'smooth' });
  }
}
