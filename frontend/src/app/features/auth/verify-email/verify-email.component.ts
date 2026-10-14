import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { VerifyEmailFacade } from './verify-email.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [SpinnerComponent, RouterLink, TranslatePipe],
  providers: [VerifyEmailFacade],
  template: `
    <div class="callback-page">
      @if (page.errorMessage(); as error) {
        <p>{{ error }}</p>
        <a class="piqo-primary cta" routerLink="/login">{{ 'common.volverAcceso' | t }}</a>
      } @else {
        <app-spinner [size]="32"></app-spinner>
        <p>{{ 'verifyEmail.confirmandoCuenta' | t }}</p>
      }
    </div>
  `,
  styles: [
    `
      .callback-page {
        min-height: 100vh;
        background: var(--p4-bg);
        color: var(--p4-text);
        font-family: var(--p4-font-ui);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 20px;
        text-align: center;
      }

      .cta {
        min-height: var(--p4-touch);
        padding: 0 20px;
        border-radius: var(--p4-radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        font: 600 14px/1 var(--p4-font-ui);
        text-decoration: none;
      }
    `,
  ],
})
export class VerifyEmailComponent implements OnInit {
  readonly page = inject(VerifyEmailFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
