import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { TopBarFacade } from './top-bar.facade';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';

/** Cabecera persistente del shell (firma + avisos + perfil). HANDOFF §5. */
@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [AvatarComponent],
  providers: [TopBarFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  readonly page = inject(TopBarFacade);
}
