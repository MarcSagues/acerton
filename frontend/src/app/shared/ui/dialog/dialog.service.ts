import { Injectable, inject } from '@angular/core';
import { ComponentType } from '@angular/cdk/overlay';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

/**
 * Envoltorio fino sobre @angular/cdk/dialog (headless, sin el theming de
 * Angular Material) para diálogos centrados: confirm-dialog, detalle de
 * trofeo. El foco atrapado, el cierre con Escape y el cierre al tocar el
 * fondo vienen ya resueltos por CDK.
 */
@Injectable({ providedIn: 'root' })
export class PiqoDialogService {
  private readonly dialog = inject(Dialog);

  open<T, R = unknown, D = unknown>(
    component: ComponentType<T>,
    config?: DialogConfig<D, DialogRef<R, T>>,
  ): DialogRef<R, T> {
    return this.dialog.open<R, D, T>(component, {
      panelClass: 'piqo-dialog-panel',
      backdropClass: 'piqo-dialog-backdrop',
      autoFocus: 'first-tabbable',
      ...config,
    });
  }
}
