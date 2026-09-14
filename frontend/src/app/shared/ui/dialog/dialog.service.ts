import { Injectable, inject } from '@angular/core';
import { ComponentType, Overlay } from '@angular/cdk/overlay';
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
  private readonly overlay = inject(Overlay);

  open<T, R = unknown, D = unknown>(
    component: ComponentType<T>,
    config?: DialogConfig<D, DialogRef<R, T>>,
  ): DialogRef<R, T> {
    return this.dialog.open<R, D, T>(component, {
      panelClass: 'piqo-dialog-panel',
      backdropClass: 'piqo-dialog-backdrop',
      autoFocus: 'first-tabbable',
      // Sin esto, CDK bloquea el scroll de fondo con su estrategia por
      // defecto (BlockScrollStrategy): fija el <body> con position:fixed en
      // el scroll actual y lo restaura al cerrar — en iOS/WKWebView, ese
      // truco provoca un salto visible al abrir el dialogo (el "scroll
      // raro" al abrir un trofeo). noop() no toca el scroll del fondo en
      // absoluto: el dialogo ya queda fijo en su sitio porque el overlay de
      // CDK se renderiza aparte del flujo normal de la pagina.
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      ...config,
    });
  }
}
