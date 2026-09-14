import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AvatarComponent } from '../../../shared/ui/avatar/avatar.component';
import { MatchdayResultsFacade } from './matchday-results.facade';
import { MatchdayShareCardComponent } from './matchday-share-card.component';

@Component({
  selector: 'app-matchday-results',
  standalone: true,
  imports: [CommonModule, RouterLink, SpinnerComponent, AvatarComponent, MatchdayShareCardComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [MatchdayResultsFacade],
  templateUrl: './matchday-results.component.html',
  styleUrl: './matchday-results.component.scss',
})
export class MatchdayResultsComponent implements OnInit {
  readonly page = inject(MatchdayResultsFacade);
  @ViewChild(MatchdayShareCardComponent) private shareCard?: MatchdayShareCardComponent;

  ngOnInit(): void {
    this.page.init();
  }

  openShareCard(): void {
    void this.shareCard?.open();
  }
}
