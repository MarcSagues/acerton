import { Injectable, inject } from '@angular/core';
import { NOTICE_PERIODS } from '../domain/demo-notice';
import { NotificationsFeedService } from '../../../core/services/notifications-feed.service';

@Injectable()
export class NotificationsPageFacade {
  private readonly feed = inject(NotificationsFeedService);

  readonly notices = this.feed.notices;
  readonly periods = NOTICE_PERIODS;

  markAllRead(): void {
    this.feed.markAllRead();
  }
}
