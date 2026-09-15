import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { LevelProgressFacade } from './level-progress.facade';

/** Ancho de cada nodo del track y relleno lateral — deben coincidir con las medidas fijadas en el SCSS (.track-inner). */
const NODE_WIDTH = 92;
const TRACK_PADDING = 149;

@Component({
  selector: 'app-level-progress',
  standalone: true,
  providers: [LevelProgressFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './level-progress.component.html',
  styleUrl: './level-progress.component.scss',
})
export class LevelProgressComponent implements OnInit {
  readonly page = inject(LevelProgressFacade);

  @ViewChild('track') private readonly trackRef?: ElementRef<HTMLElement>;

  /** Perímetro del anillo de progreso del héroe (r=39 → 2πr ≈ 245), fijo porque el radio del SVG es fijo en la plantilla. */
  readonly ringLength = 245;

  ngOnInit(): void {
    // Centra el track en el nivel actual nada mas abrir la pantalla, en vez
    // de empezar siempre desde el Nivel 1 (pedido explicito del usuario).
    // Se hace en un microtask porque el elemento del track todavia no tiene
    // su clientWidth definitivo en ngOnInit (el layout no ha corrido).
    queueMicrotask(() => this.scrollToLevel(this.page.currentLevel, false));
  }

  get ringOffset(): number {
    return this.ringLength * (1 - this.page.levelFraction);
  }

  onNodeClick(n: number): void {
    this.page.selectLevel(n);
  }

  onTierClick(firstLevel: number): void {
    this.page.selectLevel(firstLevel);
    this.scrollToLevel(firstLevel, true);
  }

  private scrollToLevel(n: number, smooth: boolean): void {
    const el = this.trackRef?.nativeElement;
    if (!el) return;
    const x = Math.max(0, (n - 1) * NODE_WIDTH + TRACK_PADDING + NODE_WIDTH / 2 - el.clientWidth / 2);
    el.scrollTo({ left: x, behavior: smooth ? 'smooth' : 'auto' });
  }
}
