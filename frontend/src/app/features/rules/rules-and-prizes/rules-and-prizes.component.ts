import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RulesAndPrizesFacade } from './rules-and-prizes.facade';

@Component({
  selector: 'app-rules-and-prizes',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [RulesAndPrizesFacade],
  templateUrl: './rules-and-prizes.component.html',
  styleUrl: './rules-and-prizes.component.scss',
})
export class RulesAndPrizesComponent {
  readonly page = inject(RulesAndPrizesFacade);
}
