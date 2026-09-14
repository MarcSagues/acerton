import { CUSTOM_ELEMENTS_SCHEMA, Component, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { CurrentMatchdayFacade } from './current-matchday.facade';
import { PredictionChoice } from '../../../core/models/matchday.model';
import { MatchdayShareCardComponent } from '../matchday-results/matchday-share-card.component';

@Component({
  selector: 'app-current-matchday',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    GroupSwitcherComponent,
    SpinnerComponent,
    EmptyStateComponent,
    MatchdayShareCardComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [CurrentMatchdayFacade],
  templateUrl: './current-matchday.component.html',
  styleUrl: './current-matchday.component.scss',
})
export class CurrentMatchdayComponent {
  readonly page = inject(CurrentMatchdayFacade);
  @ViewChild(MatchdayShareCardComponent) private shareCard?: MatchdayShareCardComponent;

  /** Opciones 1X2, compartidas entre los botones de elegir y el resumen de resultado una vez terminado el partido. */
  readonly oneXTwoOptions: { v: PredictionChoice; l: string }[] = [
    { v: 'HOME', l: '1' },
    { v: 'DRAW', l: 'X' },
    { v: 'AWAY', l: '2' },
  ];

  openShareCard(): void {
    void this.shareCard?.open();
  }
}
