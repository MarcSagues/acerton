import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CookieConsentFacade } from './cookie-consent.facade';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  providers: [CookieConsentFacade],
  templateUrl: './cookie-consent.component.html',
  styleUrl: './cookie-consent.component.scss',
})
export class CookieConsentComponent {
  readonly page = inject(CookieConsentFacade);
}
