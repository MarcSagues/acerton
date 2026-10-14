import { Component, inject } from '@angular/core';
import { NoRealMoneyNoticeFacade } from './no-real-money-notice.facade';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-no-real-money-notice',
  standalone: true,
  imports: [TranslatePipe],
  providers: [NoRealMoneyNoticeFacade],
  templateUrl: './no-real-money-notice.component.html',
  styleUrl: './no-real-money-notice.component.scss',
})
export class NoRealMoneyNoticeComponent {
  readonly page = inject(NoRealMoneyNoticeFacade);
}
