import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { CurrentMatchdayFacade } from './current-matchday.facade';

@Component({
  selector: 'app-current-matchday',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    GroupSwitcherComponent,
  ],
  providers: [CurrentMatchdayFacade],
  templateUrl: './current-matchday.component.html',
  styleUrl: './current-matchday.component.scss',
})
export class CurrentMatchdayComponent {
  readonly page = inject(CurrentMatchdayFacade);
}
