import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GroupSwitcherComponent } from '../../../layout/group-switcher/group-switcher.component';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import { CurrentMatchdayFacade } from './current-matchday.facade';
import { PredictionChoice } from '../../../core/models/matchday.model';

@Component({
  selector: 'app-current-matchday',
  standalone: true,
  imports: [CommonModule, RouterLink, GroupSwitcherComponent, SpinnerComponent, EmptyStateComponent, SegmentedControlComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [CurrentMatchdayFacade],
  templateUrl: './current-matchday.component.html',
  styleUrl: './current-matchday.component.scss',
})
export class CurrentMatchdayComponent {
  readonly page = inject(CurrentMatchdayFacade);

  readonly viewOptions = [
    { value: 'visual' as const, label: 'Visual', icon: 'tarjetas' },
    { value: 'filas' as const, label: 'Filas', icon: 'filas' },
  ];

  /** Opciones 1X2, compartidas entre los botones de elegir y el resumen de resultado una vez terminado el partido. */
  readonly oneXTwoOptions: { v: PredictionChoice; l: string }[] = [
    { v: 'HOME', l: '1' },
    { v: 'DRAW', l: 'X' },
    { v: 'AWAY', l: '2' },
  ];
}
