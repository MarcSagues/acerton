import { CUSTOM_ELEMENTS_SCHEMA, Component, Input, inject } from '@angular/core';
import { GroupSwitcherFacade } from './group-switcher.facade';
import { GroupSheetComponent } from './group-sheet.component';
import { BottomSheetService } from '../../shared/ui/bottom-sheet/bottom-sheet.service';

@Component({
  selector: 'app-group-switcher',
  standalone: true,
  providers: [GroupSwitcherFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './group-switcher.component.html',
  styleUrl: './group-switcher.component.scss',
})
export class GroupSwitcherComponent {
  readonly page = inject(GroupSwitcherFacade);
  private readonly sheet = inject(BottomSheetService);

  /** Ya no cambia el aspecto (el nuevo diseño no tiene variante oscura para
   * esta tarjeta) — se mantiene solo para que las pantallas aun no
   * reconstruidas que lo pasan sigan compilando. */
  @Input() onDark = false;

  open(): void {
    this.sheet.open(GroupSheetComponent);
  }
}
