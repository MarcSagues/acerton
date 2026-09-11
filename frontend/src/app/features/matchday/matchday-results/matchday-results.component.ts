import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { MatchdayResultsFacade } from './matchday-results.facade';

@Component({
  selector: 'app-matchday-results',
  standalone: true,
  imports: [CommonModule, RouterLink, MatProgressSpinnerModule],
  providers: [MatchdayResultsFacade],
  templateUrl: './matchday-results.component.html',
  styleUrl: './matchday-results.component.scss',
})
export class MatchdayResultsComponent implements OnInit {
  readonly page = inject(MatchdayResultsFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
