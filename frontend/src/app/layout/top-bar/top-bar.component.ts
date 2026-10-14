import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { TopBarFacade } from './top-bar.facade';
import { AvatarComponent } from '../../shared/ui/avatar/avatar.component';
import { GroupSwitcherComponent } from '../group-switcher/group-switcher.component';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

/** Cabecera persistente del shell (firma + avisos + perfil). HANDOFF §5. */
@Component({
  selector: 'app-top-bar',
  standalone: true,
  imports: [AvatarComponent, GroupSwitcherComponent, TranslatePipe],
  providers: [TopBarFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  host: {
    '[class.no-group-switcher]': '!page.hasGroupSwitcher()',
    '[class.with-group-switcher]': 'page.hasGroupSwitcher()',
  },
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  readonly page = inject(TopBarFacade);
}
