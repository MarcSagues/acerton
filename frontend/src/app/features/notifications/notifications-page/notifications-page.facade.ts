import { Injectable, inject } from '@angular/core';
import { NOTICE_PERIODS, NoticePeriod } from '../domain/notice';
import { NotificationsFeedService } from '../../../core/services/notifications-feed.service';

@Injectable()
export class NotificationsPageFacade {
  private readonly feed = inject(NotificationsFeedService);

  readonly notices = this.feed.notices;
  readonly periods = NOTICE_PERIODS;

  init(): void {
    this.feed.refresh();
  }

  /** Solo los avisos de este periodo — evita pintar una cabecera de sección vacía cuando no hay ninguno. */
  noticesForPeriod(period: NoticePeriod) {
    return this.notices().filter((notice) => notice.period === period);
  }

  markAllRead(): void {
    this.feed.markAllRead();
  }
}
