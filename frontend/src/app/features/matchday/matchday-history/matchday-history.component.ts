import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { MatchdayHistoryFacade } from './matchday-history.facade';

@Component({
  selector: 'app-matchday-history',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule, DecimalPipe],
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