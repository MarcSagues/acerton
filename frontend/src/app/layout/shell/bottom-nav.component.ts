import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BottomNavService } from '../../core/services/bottom-nav.service';
import { ActiveGroupService } from '../../core/services/active-group.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  readonly bottomNav = inject(BottomNavService);
  readonly activeGroupService = inject(ActiveGroupService);
}
