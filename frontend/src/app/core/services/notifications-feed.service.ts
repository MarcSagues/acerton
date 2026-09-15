import { Injectable, computed, inject, signal } from '@angular/core';
import { AppNotification } from '../models/notification.model';
import { NotificationsService } from './notifications.service';
import { NoticeItem, toNoticeItem } from '../../features/notifications/domain/notice';

/**
 * Estado compartido del feed real de avisos (ver Notification en el
 * schema, issue #21 "Terminar el feed de avisos") — provisto en root para
 * que la campanita del top-bar y la pantalla de avisos lean/marquen el
 * mismo estado de leido/no leido en vez de cada una la suya.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
  private readonly notificationsApi = inject(NotificationsService);
  private readonly rawNotices = signal<AppNotification[]>([]);
  private loaded = false;

  readonly notices = computed<NoticeItem[]>(() => {
    const now = new Date();
    return this.rawNotices().map((notification) => toNoticeItem(notification, now));
  });
  readonly unreadCount = computed(() => this.rawNotices().filter((notification) => notification.readAt == null).length);

  /** Carga inicial (campanita del top-bar): solo pide al backend una vez por sesion, salvo refresh() explicito. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.refresh();
  }

  /** Pantalla de avisos: siempre vuelve a pedir al backend, por si hay avisos nuevos desde la ultima carga. */
  refresh(): void {
    this.loaded = true;
    this.notificationsApi.getMine().subscribe((notices) => this.rawNotices.set(notices));
  }

  markAllRead(): void {
    const previous = this.rawNotices();
    if (previous.every((notification) => notification.readAt != null)) return;

    const now = new Date().toISOString();
    this.rawNotices.set(previous.map((notification) => ({ ...notification, readAt: notification.readAt ?? now })));
    this.notificationsApi.markAllRead().subscribe({
      error: () => this.rawNotices.set(previous),
    });
  }
}
