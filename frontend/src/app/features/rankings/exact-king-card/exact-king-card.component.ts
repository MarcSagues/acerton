import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { RankingsPageFacade } from '../rankings-page/rankings-page.facade';

/**
 * "Rey del marcador exacto" de Tabla (solo grupos de resultado exacto): quien
 * ha clavado mas marcadores en la vista actual, los siguientes y tu fila. Lee
 * el estado del RankingsPageFacade de la pantalla que lo contiene.
 */
@Component({
  selector: 'app-exact-king-card',
  standalone: true,
  imports: [AvatarComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './exact-king-card.component.html',
  styleUrl: './exact-king-card.component.scss',
})
export class ExactKingCardComponent {
  readonly page = inject(RankingsPageFacade);
}
