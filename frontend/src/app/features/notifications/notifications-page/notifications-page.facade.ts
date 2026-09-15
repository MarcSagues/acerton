import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NOTICE_PERIODS, NoticeItem, NoticePeriod } from '../domain/notice';
import { NotificationsFeedService } from '../../../core/services/notifications-feed.service';

@Injectable()
export class NotificationsPageFacade {
  private readonly feed = inject(NotificationsFeedService);
  private readonly router = inject(Router);

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

  /**
   * Al pulsar un aviso concreto: marca solo ese como leido (quita su punto
   * rojo) y, segun el tipo, navega a donde tenga sentido verlo — de
   * momento solo "subiste de nivel" lleva a elegir avatar (la recompensa
   * que acabas de desbloquear).
   */
  openNotice(notice: NoticeItem): void {
    if (notice.unread) {
      this.feed.markRead(notice.id);
    }
    if (notice.type === 'LEVEL_UP') {
      this.router.navigate(['/profile/avatar']);
    }
  }
}
