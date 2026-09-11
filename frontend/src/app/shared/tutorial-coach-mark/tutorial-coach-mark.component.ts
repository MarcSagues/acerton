import { Component, inject } from '@angular/core';
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
}
