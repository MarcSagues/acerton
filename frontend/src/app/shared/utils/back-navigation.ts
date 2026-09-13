import { Location } from '@angular/common';
import { Router } from '@angular/router';

/**
 * Vuelve atrás de verdad en el historial (misma pantalla de la que se vino,
 * igual que EdgeSwipeBackService — el botón "Volver" y el gesto de deslizar
 * deben comportarse igual). Solo cuando no hay una navegación previa dentro
 * de la app (se entró por un enlace directo, sin historial que recorrer) cae
 * en `fallback`, para no dejar el botón sin hacer nada.
 */
export function goBackOrFallback(location: Location, router: Router, fallback: unknown[]): void {
  const navigationId = (window.history.state as { navigationId?: number } | null)?.navigationId ?? 0;
  if (navigationId > 1) {
    location.back();
  } else {
    router.navigate(fallback);
  }
}
