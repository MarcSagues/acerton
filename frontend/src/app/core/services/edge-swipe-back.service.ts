import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';

const EDGE_WIDTH_PX = 24;
const MIN_DRAG_PX = 80;
const MAX_VERTICAL_DRIFT_PX = 60;

/**
 * Pestañas raiz de la barra inferior (ver bottom-nav.component.html): no
 * tienen una pantalla "anterior" real a la que volver, asi que el gesto no
 * hace nada ahi — igual que en iOS nativo, donde el swipe-back de un
 * UINavigationController no actua en la raiz de la pila.
 */
const ROOT_ROUTES = ['/matchday', '/groups', '/rankings', '/profile'];

/**
 * Gesto "deslizar desde el borde izquierdo para volver" como en iOS nativo.
 * Solo en la app nativa: en web/PWA no hay convencion de gesto de borde y
 * choca con el swipe-back real del navegador en Safari. Usa el historial
 * del Router (Location.back()) en vez de replicar la logica de cada boton
 * de volver, asi que se comporta igual que pulsar ese boton salvo en
 * pantallas cuyo boton de volver no navega hacia atras en el historial
 * (p.ej. un asistente de pasos que solo cambia de estado interno).
 */
@Injectable({ providedIn: 'root' })
export class EdgeSwipeBackService {
  private readonly location = inject(Location);
  private readonly router = inject(Router);

  private startX = 0;
  private startY = 0;
  private tracking = false;

  /**
   * Consumido una sola vez por app.config.ts (withViewTransitions) para
   * animar solo la navegacion que viene de este gesto — no las que vienen
   * de un enlace/boton normal, que no deben cambiar de comportamiento.
   */
  private pendingSwipeAnimation = false;

  init(): void {
    if (!Capacitor.isNativePlatform()) return;
    document.addEventListener('touchstart', this.onTouchStart, { passive: true });
    document.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  consumePendingSwipeAnimation(): boolean {
    const pending = this.pendingSwipeAnimation;
    this.pendingSwipeAnimation = false;
    return pending;
  }

  private readonly onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (!touch || touch.clientX > EDGE_WIDTH_PX || this.startsInsideHorizontalScroller(event.target)) {
      this.tracking = false;
      return;
    }
    this.tracking = true;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
  };

  /**
   * Filas con su propio scroll horizontal (trofeos/insignias en Perfil,
   * selector de liga en Jornada/Tabla/Resultados) a veces empiezan pegadas
   * al borde izquierdo. Sin este chequeo, arrastrar el dedo dentro de esa
   * fila para ver más elementos se confundia con el gesto de volver y
   * cerraba toda la pantalla en vez de solo deslizar la fila.
   */
  private startsInsideHorizontalScroller(target: EventTarget | null): boolean {
    let el = target instanceof Element ? target : null;
    while (el) {
      const style = getComputedStyle(el);
      const canScrollX = (style.overflowX === 'auto' || style.overflowX === 'scroll') && el.scrollWidth > el.clientWidth;
      if (canScrollX) return true;
      el = el.parentElement;
    }
    return false;
  }

  private readonly onTouchEnd = (event: TouchEvent): void => {
    if (!this.tracking) return;
    this.tracking = false;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - this.startX;
    const dy = Math.abs(touch.clientY - this.startY);
    if (dx <= MIN_DRAG_PX || dy >= MAX_VERTICAL_DRIFT_PX) return;

    const currentPath = this.router.url.split('?')[0];
    if (ROOT_ROUTES.includes(currentPath)) return;

    this.pendingSwipeAnimation = true;
    this.location.back();
  };
}
