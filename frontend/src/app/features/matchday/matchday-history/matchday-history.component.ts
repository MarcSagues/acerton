import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { EmptyStateComponent } from '../../../shared/ui/empty-state/empty-state.component';
import { MatchdayHistoryFacade } from './matchday-history.facade';

@Component({
  selector: 'app-matchday-history',
  standalone: true,
  imports: [RouterLink, DecimalPipe, SpinnerComponent, EmptyStateComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [MatchdayHistoryFacade],
  templateUrl: './matchday-history.component.html',
  styleUrl: './matchday-history.component.scss',
})
export class MatchdayHistoryComponent implements OnInit {
  readonly page = inject(MatchdayHistoryFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
