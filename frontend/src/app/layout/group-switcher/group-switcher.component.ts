import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { GroupSwitcherFacade } from './group-switcher.facade';

@Component({
  selector: 'app-group-switcher',
  standalone: true,
  imports: [RouterLink, MatMenuModule, MatIconModule],
  providers: [GroupSwitcherFacade],
  templateUrl: './group-switcher.component.html',
  styleUrl: './group-switcher.component.scss',
})
export class GroupSwitcherComponent {
  readonly page = inject(GroupSwitcherFacade);

  /** true cuando se coloca sobre una cabecera oscura de marca (siempre
   * oscura, independiente del tema activo) en vez de sobre una superficie
   * normal de la pagina. */
  @Input() onDark = false;

}
