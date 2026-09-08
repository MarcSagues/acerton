import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ErrorCode } from '@capawesome/capacitor-google-sign-in';
import { AuthService } from '../../../core/services/auth.service';
import { usernameHint, usernameValidator } from '../../../shared/username.util';

type AuthMode = 'login' | 'register';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './auth-page.component.html',
  styleUrl: './auth-page.component.scss',
})
export class AuthPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly mode = signal<AuthMode>('login');
  readonly isRegister = computed(() => this.mode() === 'register');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);
  readonly googleLoginUrl = this.authService.googleLoginUrl;
  readonly isNativePlatform = this.authService.isNativePlatform;

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const initialMode = (this.route.snapshot.data['mode'] as AuthMode) ?? 'login';
    this.setMode(initialMode);
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMessage.set(null);
    const nameControl = this.form.controls.name;
    if (mode === 'register') {
      nameControl.setValidators([Validators.required, usernameValidator()]);
    } else {
      nameControl.clearValidators();
    }
    nameControl.updateValueAndValidity();
    this.router.navigate([mode === 'register' ? '/register' : '/login']);
  }

  /** Feedback en vivo mientras se escribe, sin esperar a que se toque el campo o se intente enviar. */
  nameHint(): string | null {
    if (!this.isRegister()) return null;
    const control = this.form.controls.name;
    if (!control.value) return null;
    return usernameHint(control.errors);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  loginWithGoogleNative(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.loginWithGoogleNative().subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/matchday']);
      },
      error: (error) => {
        this.loading.set(false);
        // El usuario simplemente cerro el selector de cuenta: no es un fallo que mostrar.
        if (error?.code === ErrorCode.SignInCanceled) return;
        this.errorMessage.set('No se pudo iniciar sesion con Google');
      },
    });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { name, email, password } = this.form.getRawValue();

    const request = this.isRegister()
      ? this.authService.register({ name: name.trim(), email, password })
      : this.authService.login({ email, password });

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/matchday']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.error?.message ?? (this.isRegister() ? 'No se pudo crear la cuenta' : 'No se pudo iniciar sesion'),
        );
      },
    });
  }
}
