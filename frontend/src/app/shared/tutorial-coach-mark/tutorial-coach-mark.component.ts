import { Component, ElementRef, effect, inject, viewChild } from '@angular/core';
import { TutorialCoachMarkFacade } from './tutorial-coach-mark.facade';

/**
 * Montado una vez a nivel global (ver app.component.html). Dibuja el hueco
 * resaltado sobre el elemento real que senala el paso activo de
 * TutorialService y una burbuja con el texto junto a el — nunca bloquea el
 * elemento en si (pointer-events: none en el hueco) para que, en el paso que
 * senala un boton de navegacion, la pulsacion real del usuario llegue a
 * pasar de verdad.
 */
@Component({
  selector: 'app-tutorial-coach-mark',
  standalone: true,
  providers: [TutorialCoachMarkFacade],
  templateUrl: './tutorial-coach-mark.component.html',
  styleUrl: './tutorial-coach-mark.component.scss',
})
export class TutorialCoachMarkComponent {
  readonly page = inject(TutorialCoachMarkFacade);
  private readonly cardRef = viewChild<ElementRef<HTMLElement>>('card');
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Mide el tamano real de la tarjeta (mascota + burbuja) en vez de asumirlo
   * a mano, para que el calculo de encaje en pantalla (ver
   * TutorialCoachMarkFacade.cardLeft/cardTop/cardBottom) sea siempre
   * correcto aunque cambie el contenido, el tamano de la mascota o el
   * tamano de letra del dispositivo. Se vuelve a observar cada vez que la
   * tarjeta aparece/desaparece (cada paso del tutorial es una nueva vista).
   */
  constructor() {
    effect(() => {
      const el = this.cardRef()?.nativeElement;
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      if (!el) return;

      this.resizeObserver = new ResizeObserver(([entry]) => {
        if (!entry) return;
        this.page.setCardSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      });
      this.resizeObserver.observe(el);
    });
  }
}
