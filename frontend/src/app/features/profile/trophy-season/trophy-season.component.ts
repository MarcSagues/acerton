import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TrophySeasonFacade } from './trophy-season.facade';

@Component({
  selector: 'app-trophy-season',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [TrophySeasonFacade],
  templateUrl: './trophy-season.component.html',
  styleUrl: './trophy-season.component.scss',
})
export class TrophySeasonComponent implements OnInit {
  readonly page = inject(TrophySeasonFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
