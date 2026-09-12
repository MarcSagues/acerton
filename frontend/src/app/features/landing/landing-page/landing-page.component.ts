import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingPageFacade } from './landing-page.facade';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [LandingPageFacade],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
})
export class LandingPageComponent implements OnInit {
  readonly page = inject(LandingPageFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
