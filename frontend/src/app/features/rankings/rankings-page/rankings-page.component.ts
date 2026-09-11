import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { RankingsPageFacade } from './rankings-page.facade';

@Component({
  selector: 'app-rankings-page',
  standalone: true,
  imports: [CommonModule, GroupSwitcherComponent, MatProgressSpinnerModule],
  providers: [RankingsPageFacade],
  templateUrl: './rankings-page.component.html',
  styleUrl: './rankings-page.component.scss',
})
export class RankingsPageComponent {
  readonly page = inject(RankingsPageFacade);
}
