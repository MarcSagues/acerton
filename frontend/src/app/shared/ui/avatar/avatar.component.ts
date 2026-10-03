import { Component, Input } from '@angular/core';
import { initials } from '../../utils/initials';

/**
 * Avatar del usuario en cualquier tamano: foto/mascota de catalogo sobre su
 * color de fondo, o iniciales sobre un fondo neutro si todavia no ha
 * elegido nada. Un unico sitio para esta logica en vez de repetirla en cada
 * pantalla que muestra un avatar (top-bar, Perfil, y las que se vayan
 * sumando — rankings/miembros de grupo siguen en iniciales por ahora).
 */
@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <span class="avatar-wrap" [style.width.px]="size" [style.height.px]="size">
      <span class="avatar" [style.background]="url ? background || 'var(--p4-soft)' : 'var(--p4-soft)'" [style.width.px]="size" [style.height.px]="size">
        @if (url) {
          <img [src]="url" alt="" [style.width.px]="size" [style.height.px]="size" />
        } @else {
          <span class="initials" [style.fontSize.px]="size * 0.4">{{ initials(name) }}</span>
        }
      </span>
      @if (level) {
        <span class="level-badge" [style.fontSize.px]="Math.min(13, Math.max(9, size * 0.22))">{{ level }}</span>
      }
    </span>
  `,
  styles: [
    `
      /* Sin esto, <app-avatar> es un elemento inline por defecto (ningun
         custom element/componente lo es a menos que se declare) y
         participa en el calculo de linea base del texto igual que una
         palabra suelta — con una imagen real dentro (que anade el hueco
         de descendente propio de <img> inline) quedaba unos pixeles mas
         abajo/arriba que un avatar con solo iniciales en el mismo sitio. */
      :host {
        display: inline-flex;
      }
      .avatar-wrap {
        position: relative;
        flex: none;
      }
      .avatar {
        flex: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      /* Insignia de nivel (Sprint 14): abajo-a-la-derecha para no chocar con
         el punto rojo de "pendiente de pronosticar" que ya usa arriba-a-la-
         derecha en las tarjetas de grupo. */
      .level-badge {
        position: absolute;
        right: -2px;
        bottom: -2px;
        min-width: 1.6em;
        height: 1.6em;
        padding: 0 0.25em;
        border-radius: 999px;
        background: var(--p4-accent);
        color: var(--p4-on-accent);
        display: flex;
        align-items: center;
        justify-content: center;
        font: 700 1em var(--p4-font-display);
        line-height: 1;
        border: 2px solid var(--p4-surface);
        box-sizing: border-box;
      }
      /* cover, no contain: la mayoria de mascotas son un cuadrado exacto
         (512x512) y da igual, pero alguna (p.ej. tumbado-balon.png, mas
         ancha que alta) con contain dejaba ver el fondo por arriba/abajo
         del circulo en vez de llenarlo del todo — con cover el marco
         circular queda siempre completo, recortando el sobrante en vez
         de dejar hueco. */
      img {
        object-fit: cover;
      }
      .initials {
        color: var(--p4-accent);
        font: 700 1em var(--p4-font-display);
      }
    `,
  ],
})
export class AvatarComponent {
  @Input() url: string | null = null;
  @Input() background: string | null = null;
  @Input() name = '';
  @Input() size = 40;
  /** Nivel (Sprint 14, roadmap) — null/undefined no pinta insignia, para sitios donde el nivel todavia no aplica o no se ha cargado. */
  @Input() level: number | null = null;

  protected readonly Math = Math;

  initials(name: string): string {
    return initials(name);
  }
}
