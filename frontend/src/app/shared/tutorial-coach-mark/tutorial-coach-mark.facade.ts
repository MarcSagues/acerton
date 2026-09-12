import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { TutorialService } from '../../core/services/tutorial.service';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface CardSize {
  width: number;
  height: number;
}

const MAX_FIND_ATTEMPTS = 20; // ~3s a 150ms por intento
/** Estimacion generosa antes de la primera medicion real (ver ResizeObserver en el componente) — solo evita un primer frame mal encajado. */
const FALLBACK_CARD_SIZE: CardSize = { width: 360, height: 220 };

@Injectable()
export class TutorialCoachMarkFacade {
  readonly tutorialService = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rect = signal<Rect | null>(null);
  /**
   * Tamano real de mascota+burbuja, medido por el componente (ResizeObserver)
   * en vez de asumido a mano — asi el encaje en pantalla no depende de tener
   * que mantener sincronizados numeros sueltos con el scss cada vez que
   * cambia el diseno (padding, tamano de fuente, tamano de la mascota...).
   */
  private readonly cardSize = signal<CardSize>(FALLBACK_CARD_SIZE);
  private readonly gutter = 16;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private findAttempts = 0;

  setCardSize(size: CardSize): void {
    if (size.width > 0 && size.height > 0) {
      this.cardSize.set(size);
    }
  }

  /** Centrada sobre el objetivo, sin salirse nunca de los margenes de pantalla — en ningun eje. */
  cardLeft(r: Rect): number {
    const { width } = this.cardSize();
    const centered = r.left + r.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - this.gutter;
    return Math.min(Math.max(centered, this.gutter), Math.max(maxLeft, this.gutter));
  }

  /** Solo para placement 'bottom': la tarjeta crece hacia abajo desde el objetivo, recortada si no cabe. */
  cardTop(r: Rect): number {
    const { height } = this.cardSize();
    const naive = r.top + r.height + 14;
    const maxTop = window.innerHeight - height - this.gutter;
    return Math.min(Math.max(naive, this.gutter), Math.max(maxTop, this.gutter));
  }

  /** Solo para placement 'top': la tarjeta crece hacia arriba desde el objetivo, recortada si no cabe. */
  cardBottom(r: Rect): number {
    const { height } = this.cardSize();
    const naive = window.innerHeight - r.top + 14;
    // Limite superior: que el borde de arriba de la tarjeta no pase del margen.
    const maxBottom = Math.max(window.innerHeight - this.gutter - height, this.gutter);
    return Math.min(Math.max(naive, this.gutter), maxBottom);
  }

  constructor() {
    effect(
      () => {
        const step = this.tutorialService.currentStep();
        this.stopPolling();
        this.rect.set(null);
        if (!step) return;

        this.findAttempts = 0;
        this.pollHandle = setInterval(() => this.locateTarget(step.target), 150);
        this.locateTarget(step.target);
      },
      { allowSignalWrites: true },
    );

    this.destroyRef.onDestroy(() => this.stopPolling());
  }

  private locateTarget(selector: string): void {
    const el = document.querySelector(selector);
    if (!el) {
      this.findAttempts += 1;
      if (this.findAttempts >= MAX_FIND_ATTEMPTS) {
        // El objetivo no existe en esta pantalla (p. ej. grupo sin partidos todavia): no se bloquea el tutorial.
        this.stopPolling();
        this.tutorialService.skipCurrentStep();
      }
      return;
    }
    const box = el.getBoundingClientRect();
    this.rect.set({ top: box.top, left: box.left, width: box.width, height: box.height });
  }

  private stopPolling(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }
}
