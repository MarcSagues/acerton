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
  /** Avisos de subida de nivel ya mostrados como pop-up en esta sesion (en memoria, no persiste entre recargas). */
  private readonly shownLevelUpPopupIds = new Set<string>();

  readonly notices = computed<NoticeItem[]>(() => {
    const now = new Date();
    return this.rawNotices().map((notification) => toNoticeItem(notification, now));
  });
  readonly unreadCount = computed(() => this.rawNotices().filter((notification) => notification.readAt == null).length);
  /** Sin leer y de tipo LEVEL_UP — para el puntito de "Perfil" en el bottom-nav y la insignia del nivel en /profile/level. */
  readonly unreadLevelUps = computed(() => this.rawNotices().filter((n) => n.type === 'LEVEL_UP' && n.readAt == null));
  /** Se pone a un aviso cuando toca mostrar el pop-up de "subiste de nivel" (una vez por aviso, ver checkForLevelUpPopup). El componente que lo consume debe volver a ponerlo a null tras abrir el dialogo. */
  readonly pendingLevelUpPopup = signal<AppNotification | null>(null);

  /** Carga inicial (campanita del top-bar): solo pide al backend una vez por sesion, salvo refresh() explicito. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.refresh();
  }

  /** Pantalla de avisos: siempre vuelve a pedir al backend, por si hay avisos nuevos desde la ultima carga. */
  refresh(): void {
    this.loaded = true;
    this.notificationsApi.getMine().subscribe((notices) => {
      this.rawNotices.set(notices);
      this.checkForLevelUpPopup(notices);
    });
  }

  /**
   * Mientras se este usando la app: en cuanto aparece un LEVEL_UP sin leer
   * que todavia no se haya enseñado como pop-up en esta sesion, lo marca
   * pendiente (una vez cada uno, aunque refresh() se llame varias veces).
   */
  private checkForLevelUpPopup(notices: AppNotification[]): void {
    const unseen = notices.find(
      (n) => n.type === 'LEVEL_UP' && n.readAt == null && !this.shownLevelUpPopupIds.has(n.id),
    );
    if (unseen) {
      this.shownLevelUpPopupIds.add(unseen.id);
      this.pendingLevelUpPopup.set(unseen);
    }
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

  /** Marca un solo aviso como leido (p.ej. al pulsar el de subida de nivel para ir a elegir avatar). */
  markRead(id: string): void {
    const previous = this.rawNotices();
    const target = previous.find((n) => n.id === id);
    if (!target || target.readAt != null) return;

    const now = new Date().toISOString();
    this.rawNotices.set(previous.map((n) => (n.id === id ? { ...n, readAt: now } : n)));
    this.notificationsApi.markRead(id).subscribe({
      error: () => this.rawNotices.set(previous),
    });
  }
}
