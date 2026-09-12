import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'piqo-jornada-vista';

export type MatchdayView = 'filas' | 'visual';

/**
 * Preferencia Filas/Visual de la pantalla de Jornada (HANDOFF §6): "visual"
 * es el valor inicial, se recuerda en el dispositivo por separado del tema.
 * Servicio de raiz (no en la facade de Jornada) para que Apariencia pueda
 * cambiarla tambien, ambas viendo el mismo estado en vivo.
 */
@Injectable({ providedIn: 'root' })
export class MatchdayViewService {
  readonly view = signal<MatchdayView>(this.readStored());

  setView(view: MatchdayView): void {
    this.view.set(view);
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      // Privado/sin storage: la vista vuelve a "visual" la proxima vez, no es grave.
    }
  }

  private readStored(): MatchdayView {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'filas' ? 'filas' : 'visual';
    } catch {
      return 'visual';
    }
  }
}
