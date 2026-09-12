import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BottomNavComponent } from './bottom-nav.component';
import { TopBarComponent } from '../top-bar/top-bar.component';
import { ShellFacade } from './shell.facade';

interface BgCircle {
  kind: 'ring' | 'orb';
  style: Record<string, string>;
}

/** Entre 3 y N, sin repetir, para que la mezcla de tamaños/tonos varíe de verdad entre aperturas. */
function pick<T>(arr: T[], count: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < count && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Genera el campo de circulos/anillos del fondo con posiciones, tamanos y
 * ritmo de deriva aleatorios. Se calcula una sola vez por instancia del
 * shell (una vez por apertura/recarga de la app, no en cada navegacion,
 * ya que el shell no se vuelve a crear al cambiar de pantalla), para que
 * la composicion cambie "cada vez que entras en la app" sin moverse bajo
 * los pies del usuario mientras la usa.
 */
function buildBackgroundCircles(): BgCircle[] {
  // Los tonos en si (--p4-bloom-1/2) los define styles.scss por tema: en
  // oscuro son el champan/bronce claros de siempre; en claro son tonos
  // oscuros y saturados, para que las manchas contrasten contra --p4-bg
  // en vez de perderse (un champan clarito casi no se ve sobre crema).
  const tones = ['rgba(var(--p4-bloom-1), TONE)', 'rgba(var(--p4-bloom-2), TONE)'];
  const slots = pick(
    [
      { top: [-14, 6], left: [-16, 4] },
      { top: [-10, 10], left: [58, 88] },
      { top: [16, 34], left: [26, 54] },
      { top: [30, 48], left: [-12, 10] },
      { top: [46, 64], left: [64, 92] },
      { top: [58, 78], left: [18, 40] },
      { top: [78, 96], left: [-14, 8] },
      { top: [82, 100], left: [52, 82] },
    ],
    Math.random() < 0.5 ? 5 : 6,
  );

  return slots.map((slot, i) => {
    const kind: BgCircle['kind'] = i % 2 === 0 ? 'ring' : 'orb';
    const size = Math.round(rand(150, 380));
    const duration = rand(22, 38).toFixed(1);
    const delay = -rand(0, Number(duration)).toFixed(1);
    const dx = Math.round(rand(-26, 26));
    const dy = Math.round(rand(-20, 20));
    const dr = Math.round(rand(-10, 10));
    const style: Record<string, string> = {
      top: `${rand(slot.top[0], slot.top[1]).toFixed(1)}%`,
      left: `${rand(slot.left[0], slot.left[1]).toFixed(1)}%`,
      width: `${size}px`,
      height: `${size}px`,
      '--dx': `${dx}px`,
      '--dy': `${dy}px`,
      '--dr': `${dr}deg`,
      'animation-duration': `${duration}s`,
      'animation-delay': `${delay}s`,
    };
    if (kind === 'ring') {
      style['border-color'] = tones[i % 2].replace('TONE', rand(0.16, 0.3).toFixed(2));
    } else {
      const tone = tones[i % 2].replace('TONE', rand(0.16, 0.26).toFixed(2));
      style['background'] = `radial-gradient(circle, ${tone}, transparent 65%)`;
    }
    return { kind, style };
  });
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, BottomNavComponent, TopBarComponent],
  providers: [ShellFacade],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  readonly page = inject(ShellFacade);

  readonly backgroundCircles = buildBackgroundCircles();

  ngOnInit(): void {
    this.page.init();
  }
}
