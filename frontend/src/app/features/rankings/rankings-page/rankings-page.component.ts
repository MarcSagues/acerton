import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { RankingsPageFacade } from './rankings-page.facade';

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, GroupSwitcherComponent, SpinnerComponent, SegmentedControlComponent, AvatarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [RankingsPageFacade],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.scss',
})
export class RankingsPageComponent {
  readonly page = inject(RankingsPageFacade);

  readonly periodOptions = [
    { value: 'WEEKLY' as const, label: 'Semanal' },
    { value: 'TOTAL' as const, label: 'Total' },
  ];
}
