import { CUSTOM_ELEMENTS_SCHEMA, Component, ElementRef, OnInit, ViewChild, effect, inject } from '@angular/core';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { LevelProgressFacade } from './level-progress.facade';

/** Ancho de cada nodo del track y relleno lateral — deben coincidir con las medidas fijadas en el SCSS (.track-inner). */
const NODE_WIDTH = 92;
const TRACK_PADDING = 149;

@Component({
  selector: 'app-level-progress',
  standalone: true,
  imports: [SpinnerComponent],
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

  private centeredOnce = false;

  constructor() {
    // Centra el track en el nivel actual la primera vez que la carga real
    // (page.loading) termina, en vez de empezar siempre desde el Nivel 1
    // (pedido explicito del usuario). En un effect (no en ngOnInit) porque
    // el nivel llega de forma asincrona (ProfileController).
    effect(() => {
      if (!this.page.loading() && !this.centeredOnce) {
        this.centeredOnce = true;
        queueMicrotask(() => this.scrollToLevel(this.page.currentLevel(), false));
      }
    });
  }

  ngOnInit(): void {
    this.page.init();
  }

  get ringOffset(): number {
    return this.ringLength * (1 - this.page.levelFraction());
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
