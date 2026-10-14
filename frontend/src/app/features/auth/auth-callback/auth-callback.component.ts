import { Component, OnInit, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { AuthCallbackFacade } from './auth-callback.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [SpinnerComponent, TranslatePipe],
  providers: [AuthCallbackFacade],
  template: `
    <div class="callback-page">
      @if (page.errorMessage()) {
        <p>{{ page.errorMessage() }}</p>
      } @else {
        <app-spinner [size]="32"></app-spinner>
        <p>{{ 'authCallback.completandoInicioSesion' | t }}</p>
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
      }
    `,
  ],
})
export class AuthCallbackComponent implements OnInit {
  readonly page = inject(AuthCallbackFacade);

  ngOnInit(): void {
    this.page.init();
  }
}
