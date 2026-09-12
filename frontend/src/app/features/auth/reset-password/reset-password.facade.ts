import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Injectable()
export class ResetPasswordFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  private token: string | null = null;
  readonly missingToken = signal(false);
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', [Validators.required]],
  });

  init(): void {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.missingToken.set(true);
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirm } = this.form.getRawValue();
    if (password !== confirm) {
      this.errorMessage.set('Las contrasenas no coinciden');
      return;
    }
    if (!this.token) {
      this.missingToken.set(true);
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.resetPassword(this.token, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.message ?? 'No se pudo restablecer la contrasena');
      },
    });
  }
}
