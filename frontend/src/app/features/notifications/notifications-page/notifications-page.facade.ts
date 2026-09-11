import { Injectable, signal } from '@angular/core';
import { DEMO_NOTICES, NOTICE_PERIODS } from '../domain/demo-notice';

@Injectable()
export class NotificationsPageFacade {
  readonly notices = signal(DEMO_NOTICES.map((notice) => ({ ...notice })));
  readonly periods = NOTICE_PERIODS;

  markAllRead(): void {
    this.notices.update((items) => items.map((notice) => ({ ...notice, unread: false })));
  }
}
