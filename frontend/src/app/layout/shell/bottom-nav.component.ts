import { CUSTOM_ELEMENTS_SCHEMA, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BottomNavService } from '../../core/services/bottom-nav.service';
import { ActiveGroupService } from '../../core/services/active-group.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';

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
  readonly notificationsFeed = inject(NotificationsFeedService);

  /** Ver comentario en BottomNavService.liveJornadaPending: en vivo si Jornada esta montada, si no el ultimo dato conocido del grupo activo. */
  readonly hasPendingJornadaPicks = computed(
    () => this.bottomNav.liveJornadaPending() ?? this.activeGroupService.activeGroupHasPendingPicks(),
  );
}
