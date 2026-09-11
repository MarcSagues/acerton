import { Component, OnInit, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthCallbackFacade } from './auth-callback.facade';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  providers: [AuthCallbackFacade],
  template: `
    <div class="callback-page">
      @if (page.errorMessage()) {
        <p>{{ page.errorMessage() }}</p>
      } @else {
        <mat-spinner></mat-spinner>
        <p>Completando inicio de sesion...</p>
      }
    </div>
  `,
  styles: [
    `
      .callback-page {
        min-height: 100vh;
        background: var(--bg);
        color: var(--text-primary);
        font-family: var(--font-ui);
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
