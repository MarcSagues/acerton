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
    <span class="avatar" [style.background]="url ? background || 'var(--p4-soft)' : 'var(--p4-soft)'" [style.width.px]="size" [style.height.px]="size">
      @if (url) {
        <img [src]="url" alt="" [style.width.px]="size" [style.height.px]="size" />
      } @else {
        <span class="initials" [style.fontSize.px]="size * 0.4">{{ initials(name) }}</span>
      }
    </span>
  `,
  styles: [
    `
      .avatar {
        flex: none;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      img {
        object-fit: contain;
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

  initials(name: string): string {
    return initials(name);
  }
}
