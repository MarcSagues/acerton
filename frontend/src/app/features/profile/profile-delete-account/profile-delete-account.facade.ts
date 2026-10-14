import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../shared/ui/toast/toast.service';
import { PiqoDialogService } from '../../../shared/ui/dialog/dialog.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { t } from '../../../core/i18n/translate';

@Injectable()
export class ProfileDeleteAccountFacade {
  private readonly router = inject(Router);
  readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(PiqoDialogService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);
  /** Paso extra de confirmacion (Guideline 5.1.1(v): "confirmation steps to prevent accidental deletion" es explicitamente valido). */
  readonly acknowledged = signal(false);

  readonly hasPassword = computed(() => this.authService.currentUser()?.hasPassword ?? false);

  readonly form = this.fb.nonNullable.group({
    password: [''],
  });

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  toggleAcknowledged(): void {
    this.acknowledged.update((value) => !value);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }

  private confirm(data: ConfirmDialogData) {
    return this.dialog.open<ConfirmDialogComponent, boolean, ConfirmDialogData>(ConfirmDialogComponent, { data })
      .closed;
  }

  submit(): void {
    this.errorMessage.set(null);

    if (!this.acknowledged()) {
      this.errorMessage.set(t('profileDeleteAccount.confirmaEntiendesEstaAccion'));
      return;
    }

    const { password } = this.form.getRawValue();
    if (this.hasPassword() && !password) {
      this.errorMessage.set(t('profileDeleteAccount.introduceContrasenaConfirmar'));
      return;
    }

    this.confirm({
      title: t('common.eliminarCuenta'),
      message:
        t('profileDeleteAccount.borraranPerfilPronosticosInsignias'),
      confirmLabel: t('profileDeleteAccount.eliminarCuenta'),
    }).subscribe((confirmed) => {
      if (!confirmed) return;
      this.deleteAccount(password || undefined);
    });
  }

  private deleteAccount(password?: string): void {
    this.loading.set(true);
    this.authService.deleteAccount(password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toast.show(t('profileDeleteAccount.cuentaHaEliminado'));
        this.router.navigate(['/login']);
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.message ?? t('profileDeleteAccount.pudoEliminarCuenta'));
      },
    });
  }
}
