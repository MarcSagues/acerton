import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { NotificationsPageFacade } from './notifications-page.facade';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  providers: [NotificationsPageFacade],
  templateUrl: './notifications-page.component.html',
  styleUrl: './notifications-page.component.scss',
})
export class NotificationsPageComponent {
  readonly page = inject(NotificationsPageFacade);
}
