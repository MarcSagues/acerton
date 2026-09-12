import { Injectable, inject } from '@angular/core';
import { Location } from '@angular/common';
import { Capacitor } from '@capacitor/core';

const EDGE_WIDTH_PX = 24;
const MIN_DRAG_PX = 80;
const MAX_VERTICAL_DRIFT_PX = 60;

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

  private startX = 0;
  private startY = 0;
  private tracking = false;

  init(): void {
    if (!Capacitor.isNativePlatform()) return;
    document.addEventListener('touchstart', this.onTouchStart, { passive: true });
    document.addEventListener('touchend', this.onTouchEnd, { passive: true });
  }

  private readonly onTouchStart = (event: TouchEvent): void => {
    const touch = event.touches[0];
    if (!touch || touch.clientX > EDGE_WIDTH_PX) {
      this.tracking = false;
      return;
    }
    this.tracking = true;
    this.startX = touch.clientX;
    this.startY = touch.clientY;
  };

  private readonly onTouchEnd = (event: TouchEvent): void => {
    if (!this.tracking) return;
    this.tracking = false;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const dx = touch.clientX - this.startX;
    const dy = Math.abs(touch.clientY - this.startY);
    if (dx > MIN_DRAG_PX && dy < MAX_VERTICAL_DRIFT_PX) {
      this.location.back();
    }
  };
}
