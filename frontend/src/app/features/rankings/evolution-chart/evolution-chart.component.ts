import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { EvolutionChart, EvolutionSeries } from '../rankings-page/rankings-page.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const HEIGHT = 172;
const PAD = { top: 12, right: 14, bottom: 24, left: 30 };
/** Alto extra para la segunda linea del eje (la liga de cada jornada en "General"). */
const SUBLABEL_EXTRA = 14;

interface PlottedSeries extends EvolutionSeries {
  path: string;
  points: { x: number; y: number }[];
}

/**
 * Grafica de lineas de la clasificacion: una linea por jugador (tu, mas
 * gruesa y siempre por encima). Tocar o pasar el puntero por una jornada
 * enseña los puntos de todos en ella; tocar un nombre de la leyenda resalta su
 * linea. SVG propio en pixeles reales (mide su ancho), sin librerias.
 */
@Component({
  selector: 'app-evolution-chart',
  standalone: true,
  imports: [TranslatePipe],
  templateUrl: './evolution-chart.component.html',
  styleUrl: './evolution-chart.component.scss',
})
export class EvolutionChartComponent {
  readonly chart = input.required<EvolutionChart>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly width = signal(320);
  /** Con segunda linea en el eje (General) la grafica es algo mas alta; la zona de las lineas no cambia. */
  readonly height = computed(() => HEIGHT + (this.chart().sublabels?.length ? SUBLABEL_EXTRA : 0));
  readonly pad = PAD;
  /** Linea base del texto del eje (jornada); la segunda linea, si la hay, va debajo. */
  readonly labelY = HEIGHT - 6;
  /** Jornada con la lectura abierta (indice), o null. */
  readonly activeIndex = signal<number | null>(null);
  /** Jugador resaltado desde la leyenda, o null. */
  readonly focusedUserId = signal<string | null>(null);

  readonly plotWidth = computed(() => Math.max(40, this.width() - PAD.left - PAD.right));
  readonly plotHeight = HEIGHT - PAD.top - PAD.bottom;

  /** Maximo "redondo" del eje y y sus marcas (0 incluido), como mucho cuatro. */
  readonly yScale = computed(() => {
    const max = Math.max(1, ...this.chart().series.flatMap((s) => s.values));
    const step = niceStep(max / 3);
    const top = Math.ceil(max / step) * step;
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
    return { top, ticks };
  });

  readonly xs = computed(() => {
    const n = this.chart().labels.length;
    const w = this.plotWidth();
    // Con una sola jornada el punto va centrado.
    return this.chart().labels.map((_, i) => PAD.left + (n === 1 ? w / 2 : (i * w) / (n - 1)));
  });

  /** Ancho de la franja que resalta la jornada vista: estrecha, para no salirse de la tarjeta en los extremos. */
  readonly band = computed(() => {
    const n = this.chart().labels.length;
    return Math.min(34, n <= 1 ? this.plotWidth() : (this.plotWidth() / (n - 1)) * 0.8);
  });

  readonly plotted = computed<PlottedSeries[]>(() => {
    const xs = this.xs();
    const top = this.yScale().top;
    const y = (v: number) => PAD.top + this.plotHeight - (v / top) * this.plotHeight;
    // Tu linea se pinta la ultima para que quede por encima de las demas.
    const ordered = [...this.chart().series].sort((a, b) => Number(a.isMe) - Number(b.isMe));
    return ordered.map((series) => {
      const points = series.values.map((v, i) => ({ x: xs[i], y: y(v) }));
      return { ...series, points, path: points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') };
    });
  });

  readonly yTicks = computed(() => {
    const { top, ticks } = this.yScale();
    return ticks.map((v) => ({ value: v, y: PAD.top + this.plotHeight - (v / top) * this.plotHeight }));
  });

  /** Lectura de la jornada activa: todos los jugadores, de mas a menos puntos. */
  readonly readout = computed(() => {
    const index = this.activeIndex();
    if (index === null) return null;
    const chart = this.chart();
    const rows = [...chart.series]
      .map((s) => ({ userId: s.userId, name: s.name, slot: s.slot, isMe: s.isMe, value: s.values[index] ?? 0 }))
      .sort((a, b) => b.value - a.value || Number(b.isMe) - Number(a.isMe));
    // La tarjeta se coloca al lado contrario de la jornada para no taparla.
    const x = this.xs()[index];
    const alignRight = x > PAD.left + this.plotWidth() / 2;
    const full = chart.fullLabels?.[index];
    return { label: full ? `${chart.labels[index]} · ${full}` : chart.labels[index], rows, x, alignRight };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const measure = () => {
        const w = this.host.nativeElement.clientWidth;
        if (w > 0) this.width.set(w);
      };
      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(this.host.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  isDimmed(userId: string): boolean {
    const focused = this.focusedUserId();
    return focused !== null && focused !== userId;
  }

  toggleFocus(userId: string): void {
    this.focusedUserId.update((current) => (current === userId ? null : userId));
  }

  onPointer(event: PointerEvent): void {
    const svg = event.currentTarget as SVGElement;
    const box = svg.getBoundingClientRect();
    const x = event.clientX - box.left;
    const xs = this.xs();
    let nearest = 0;
    xs.forEach((value, i) => {
      if (Math.abs(value - x) < Math.abs(xs[nearest] - x)) nearest = i;
    });
    // En pantalla tactil, tocar otra vez la misma jornada cierra la lectura.
    if (event.type === 'pointerdown' && event.pointerType !== 'mouse' && this.activeIndex() === nearest) {
      this.activeIndex.set(null);
      return;
    }
    this.activeIndex.set(nearest);
  }

  onPointerLeave(event: PointerEvent): void {
    // Con el dedo la lectura se queda abierta hasta tocar fuera o la misma jornada.
    if (event.pointerType === 'mouse') this.activeIndex.set(null);
  }

  onKey(event: KeyboardEvent): void {
    const last = this.chart().labels.length - 1;
    const current = this.activeIndex();
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const start = current ?? (delta > 0 ? -1 : last + 1);
      this.activeIndex.set(Math.min(last, Math.max(0, start + delta)));
    } else if (event.key === 'Escape') {
      this.activeIndex.set(null);
    }
  }
}

/** 1, 2, 5, 10, 20, 25, 50, 100... el primero que sea >= raw (siempre entero: 2,5 solo desde 25). */
function niceStep(raw: number): number {
  if (raw <= 1) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factors = magnitude >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
  for (const factor of factors) {
    if (factor * magnitude >= raw) return factor * magnitude;
  }
  return 10 * magnitude;
}
