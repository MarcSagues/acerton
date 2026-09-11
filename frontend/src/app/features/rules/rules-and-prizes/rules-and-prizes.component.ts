import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { RulesAndPrizesFacade } from './rules-and-prizes.facade';

@Component({
  selector: 'app-rules-and-prizes',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  providers: [RulesAndPrizesFacade],
  templateUrl: './rules-and-prizes.component.html',
  styleUrl: './rules-and-prizes.component.scss',
})
export class RulesAndPrizesComponent {
  readonly page = inject(RulesAndPrizesFacade);
}
