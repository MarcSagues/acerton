import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { MatchdayResultsFacade } from './matchday-results.facade';

@Component({
  selector: 'app-matchday-results',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, AvatarComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
