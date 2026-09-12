import { CUSTOM_ELEMENTS_SCHEMA, Component, OnInit, inject } from '@angular/core';
import { NotificationSettingsFacade } from './notification-settings.facade';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [NotificationSettingsFacade],
  templateUrl: './notification-settings.component.html',
  styleUrl: './notification-settings.component.scss',
})
export class NotificationSettingsComponent implements OnInit {
  readonly page = inject(NotificationSettingsFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
