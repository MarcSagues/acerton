import { Component, Input } from '@angular/core';
import { FavoriteTeam } from '../../../core/models/favorite-team.model';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

/**
 * Bandera fina y larga con los dos colores del equipo favorito, y debajo su nombre. La usan el perfil
 * propio y el de los demas miembros; sin equipo no pinta nada.
 */
@Component({
  selector: 'app-team-flag',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    @if (team) {
      <span
        class="flag"
        role="img"
        [attr.aria-label]="'favoriteTeam.banderaDe' | t: { team: team.name }"
        [style.background]="'linear-gradient(90deg, ' + team.primary + ' 50%, ' + team.secondary + ' 50%)'"
      ></span>
      <span class="caption mono">{{ 'favoriteTeam.equipoFavoritoNombre' | t: { team: team.name } }}</span>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .flag {
        display: block;
        width: 100%;
        height: 8px;
        border-radius: 4px;
        /* Borde fino que se ve con cualquier tema: la mitad blanca sobre fondo claro y la negra sobre oscuro. */
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--p4-text) 30%, transparent);
      }
      .caption {
        display: block;
        margin-top: 6px;
        font-size: 11px;
        color: var(--p4-muted);
      }
    `,
  ],
})
export class TeamFlagComponent {
  @Input() team: FavoriteTeam | null | undefined;
}
