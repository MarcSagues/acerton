import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { RankingsPageFacade } from './rankings-page.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { t } from '../../../core/i18n/translate';

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, GroupSwitcherComponent, SpinnerComponent, SegmentedControlComponent, AvatarComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [RankingsPageFacade],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.scss',
})
export class RankingsPageComponent {
  readonly page = inject(RankingsPageFacade);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly periodOptions = [
    { value: 'WEEKLY' as const, label: t('rankingsPage.semanal') },
    { value: 'TOTAL' as const, label: t('rankingsPage.total') },
  ];

  constructor() {
    // Con las jornadas en orden J1, J2, J3... la elegida (por defecto la ultima)
    // puede quedar fuera de la pantalla: se centra en la fila de jornadas.
    effect(() => {
      this.page.showMatchdayPicker();
      this.page.selectedMatchdayId();
      this.page.matchdayChips();
      setTimeout(() => this.centerSelectedMatchday());
    });
  }

  private centerSelectedMatchday(): void {
    const row = this.host.nativeElement.querySelector<HTMLElement>('.md-pills');
    const chip = row?.querySelector<HTMLElement>('.comp-pill.active');
    if (!row || !chip) return;
    const rowBox = row.getBoundingClientRect();
    const chipBox = chip.getBoundingClientRect();
    row.scrollTo({ left: row.scrollLeft + chipBox.left - rowBox.left - (rowBox.width - chipBox.width) / 2 });
  }
}
