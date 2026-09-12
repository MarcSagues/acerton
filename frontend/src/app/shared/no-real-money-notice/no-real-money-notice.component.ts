import { Component, inject } from '@angular/core';
import { NoRealMoneyNoticeFacade } from './no-real-money-notice.facade';

@Component({
  selector: 'app-no-real-money-notice',
  standalone: true,
  providers: [NoRealMoneyNoticeFacade],
  templateUrl: './no-real-money-notice.component.html',
  styleUrl: './no-real-money-notice.component.scss',
})
export class NoRealMoneyNoticeComponent {
  readonly page = inject(NoRealMoneyNoticeFacade);
}
