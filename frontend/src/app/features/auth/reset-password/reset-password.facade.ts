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
  /** Cada campo de contraseña se muestra/oculta por separado: pulsar el ojo de uno no debe afectar al otro. */
  private readonly visibleFields = signal<ReadonlySet<string>>(new Set());

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

  isPasswordVisible(field: string): boolean {
    return this.visibleFields().has(field);
  }

  togglePasswordVisibility(field: string): void {
    this.visibleFields.update((current) => {
      const next = new Set(current);
      if (next.has(field)) {
        next.delete(field);
      } else {
        next.add(field);
      }
      return next;
    });
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
