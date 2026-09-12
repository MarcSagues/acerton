import { Injectable, computed, signal } from '@angular/core';
import { DEMO_NOTICES } from '../../features/notifications/domain/demo-notice';

/**
 * Estado compartido de la lista de avisos (ver domain/demo-notice.ts: el
 * producto todavia no tiene un historial de avisos persistido, asi que
 * esto sigue siendo una lista de muestra) — provisto en root para que la
 * campanita del top-bar y la pantalla de avisos lean/marquen el mismo
 * estado de leido/no leido en vez de cada una la suya.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsFeedService {
  readonly notices = signal(DEMO_NOTICES.map((notice) => ({ ...notice })));
  readonly unreadCount = computed(() => this.notices().filter((notice) => notice.unread).length);

  markAllRead(): void {
    this.notices.update((items) => items.map((notice) => ({ ...notice, unread: false })));
  }
}
