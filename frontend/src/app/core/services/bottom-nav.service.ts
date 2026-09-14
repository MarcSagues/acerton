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

  /**
   * Punto rojo sobre "Jornada": queda algun partido abierto sin pronostico,
   * en cualquiera de las competiciones del grupo activo. Vive aqui (no en
   * CurrentMatchdayFacade) porque la barra inferior no es hija de esa
   * pantalla — sigue mostrando el ultimo valor conocido aunque se navegue
   * fuera de Jornada, que es justo el punto de un recordatorio persistente.
   */
  private readonly hasPendingJornadaPicksSignal = signal(false);
  readonly hasPendingJornadaPicks = this.hasPendingJornadaPicksSignal.asReadonly();

  setHasPendingJornadaPicks(pending: boolean): void {
    this.hasPendingJornadaPicksSignal.set(pending);
  }
}
