import { Injectable, inject } from '@angular/core';
import { ComponentType, Overlay } from '@angular/cdk/overlay';
import { Dialog, DialogConfig, DialogRef } from '@angular/cdk/dialog';

/**
 * Panel inferior (selector de grupo, y cualquier otro futuro) sobre
 * @angular/cdk/dialog: ancla el overlay al borde inferior de la pantalla,
 * en vez del centro por defecto. El foco atrapado, el cierre con Escape y
 * el cierre al tocar el fondo vienen resueltos por CDK (HANDOFF §10).
 *
 * Entrada: 280ms (CSS, ver .piqo-sheet-panel). Salida: solo la ruta de
 * cierre explícito (closeAnimated) reproduce los 180ms de salida — cerrar
 * con Escape o tocando fuera cierra al instante, una simplificación
 * consciente frente al spec para no reimplementar el ciclo de cierre de
 * CDK entero.
 */
@Injectable({ providedIn: 'root' })
export class BottomSheetService {
  private readonly dialog = inject(Dialog);
  private readonly overlay = inject(Overlay);

  open<T, R = unknown, D = unknown>(
    component: ComponentType<T>,
    config?: DialogConfig<D, DialogRef<R, T>>,
  ): DialogRef<R, T> {
    return this.dialog.open<R, D, T>(component, {
      panelClass: 'piqo-sheet-panel',
      backdropClass: 'piqo-dialog-backdrop',
      autoFocus: 'first-tabbable',
      positionStrategy: this.overlay.position().global().centerHorizontally().bottom('0'),
      // Sin esto, CDK bloquea el scroll de fondo con su estrategia por
      // defecto (BlockScrollStrategy): fija el <body> con position:fixed en
      // el scroll actual y lo restaura al cerrar — en iOS/WKWebView, ese
      // truco desplaza el contenido de fondo fuera de la vista (parece que
      // "desaparece" en vez de quedarse detras del sheet). Mismo arreglo que
      // PiqoDialogService (ver ese archivo).
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      ...config,
    });
  }

  /** Cierre explícito (p.ej. al elegir una opción) con la animación de salida de 180ms. */
  closeAnimated<R>(ref: DialogRef<R>, result?: R): void {
    const panel = ref.overlayRef.overlayElement;
    panel.classList.add('piqo-sheet-leaving');
    setTimeout(() => ref.close(result), 180);
  }
}
