import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { MatchdayCalendarFacade } from './matchday-calendar.facade';

@Component({
  selector: 'app-matchday-calendar',
  standalone: true,
  imports: [RouterLink, MatProgressSpinnerModule],
  providers: [MatchdayCalendarFacade],
  templateUrl: './matchday-calendar.component.html',
  styleUrl: './matchday-calendar.component.scss',
})
export class MatchdayCalendarComponent implements OnInit {
  readonly page = inject(MatchdayCalendarFacade);

  ngOnInit(): void {
    this.page.init();
  }
}