import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [MatProgressSpinnerModule],
  template: `
    <div class="callback-page">
      @if (errorMessage()) {
        <p>{{ errorMessage() }}</p>
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
  readonly errorMessage = signal<string | null>(null);

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    const accessToken = this.route.snapshot.queryParamMap.get('accessToken');
    if (!accessToken) {
      this.errorMessage.set('Falta el token de acceso en la respuesta de Google');
      return;
    }

    this.authService.completeGoogleLogin(accessToken).subscribe({
      next: () => this.router.navigate(['/matchday']),
      error: () => this.errorMessage.set('No se pudo completar el inicio de sesion con Google'),
    });
  }
}
