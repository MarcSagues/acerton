import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationsPageFacade } from './notifications-page.facade';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [NotificationsPageFacade],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent implements OnInit {
  readonly page = inject(NotificationsPageFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
