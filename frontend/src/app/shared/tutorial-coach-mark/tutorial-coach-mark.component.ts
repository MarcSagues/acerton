import { Component, DestroyRef, OnDestroy, effect, inject, signal } from '@angular/core';
import { TutorialService } from '../../core/services/tutorial.service';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const MAX_FIND_ATTEMPTS = 20; // ~3s a 150ms por intento

/**
 * Montado una vez a nivel global (ver app.component.html). Dibuja el hueco
 * resaltado sobre el elemento real que senala el paso activo de
 * TutorialService y una burbuja con el texto junto a el — nunca bloquea el
 * elemento en si (pointer-events: none en el hueco) para que, en el paso que
 * senala un boton de navegacion, la pulsacion real del usuario llegue a
 * pasar de verdad.
 */
@Component({
  selector: 'app-tutorial-coach-mark',
  standalone: true,
  templateUrl: './tutorial-coach-mark.component.html',
  styleUrl: './tutorial-coach-mark.component.scss',
})
export class TutorialCoachMarkComponent implements OnDestroy {
  readonly tutorialService = inject(TutorialService);
  private readonly destroyRef = inject(DestroyRef);

  readonly rect = signal<Rect | null>(null);
  /** Debe coincidir con el max-width real de .bubble en el scss — solo se usa para no salirse de pantalla. */
  private readonly bubbleWidth = 280;
  private readonly gutter = 16;
  private pollHandle: ReturnType<typeof setInterval> | null = null;
  private findAttempts = 0;

  get viewportHeight(): number {
    return window.innerHeight;
  }

  /** Centrada sobre el objetivo, sin salirse de los margenes laterales de la pantalla. */
  bubbleLeft(r: Rect): number {
    const centered = r.left + r.width / 2 - this.bubbleWidth / 2;
    const maxLeft = window.innerWidth - this.bubbleWidth - this.gutter;
    return Math.min(Math.max(centered, this.gutter), Math.max(maxLeft, this.gutter));
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

  ngOnDestroy(): void {
    this.stopPolling();
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
