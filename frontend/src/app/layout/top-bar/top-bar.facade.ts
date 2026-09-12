import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';

@Injectable()
export class TopBarFacade {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsFeed = inject(NotificationsFeedService);

  readonly currentUser = this.authService.currentUser;
  readonly unreadCount = this.notificationsFeed.unreadCount;

  goNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goProfile(): void {
    this.router.navigate(['/profile']);
  }
}
