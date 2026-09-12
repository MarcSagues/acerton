import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';

@Injectable()
export class ProfileChangePasswordFacade {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.errorMessage.set('Las contrasenas nuevas no coinciden');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show('Contraseña actualizada');
        this.goBack();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.message ?? 'No se pudo cambiar la contrasena');
      },
    });
  }
}
