import { Injectable, signal } from '@angular/core';

/**
 * Deja que una pantalla pida ocultar la barra inferior aunque su propia ruta
 * no este en ROUTES_WITHOUT_BOTTOM_NAV (ver ShellFacade.hideBottomNav) — el
 * caso de "Ver resumen" en Jornada, que es un estado dentro del mismo
 * componente/ruta (no una navegacion), no una ruta distinta. La pantalla que
 * llama a forceHidden(true) es responsable de volver a ponerlo a false al
 * salir de ese estado (p.ej. en ngOnDestroy o al cerrar el resumen).
 */
@Injectable({ providedIn: 'root' })
export class BottomNavService {
  private readonly forceHiddenSignal = signal(false);
  readonly forceHidden = this.forceHiddenSignal.asReadonly();

  setForceHidden(hidden: boolean): void {
    this.forceHiddenSignal.set(hidden);
  }
}
