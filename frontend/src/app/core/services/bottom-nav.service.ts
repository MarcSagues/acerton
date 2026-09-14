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
   * Punto rojo de "Jornada": mientras esa pantalla esta montada,
   * CurrentMatchdayFacade empuja aqui el valor calculado en vivo (reactivo
   * a la cuenta atras y a cada guardado), porque solo ella tiene cargadas
   * las predicciones del grupo activo — ActiveGroupService.
   * activeGroupHasPendingPicks() (el mismo dato que ya alimenta "Grupos")
   * solo se refresca en cada navegacion via hasGroupGuard, asi que por si
   * solo se quedaria desfasado si una ventana de pronostico se abre
   * mientras el usuario ya esta parado en Jornada sin volver a navegar.
   * Al salir de Jornada esto vuelve a null y el punto cae de nuevo en ese
   * dato del grupo, que hasGroupGuard ya habra refrescado con la
   * navegacion de salida.
   */
  private readonly liveJornadaPendingSignal = signal<boolean | null>(null);
  readonly liveJornadaPending = this.liveJornadaPendingSignal.asReadonly();

  setLiveJornadaPending(pending: boolean | null): void {
    this.liveJornadaPendingSignal.set(pending);
  }
}
