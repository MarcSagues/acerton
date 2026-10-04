import { AppNotification, NotificationType } from '../../../core/models/notification.model';

export type NoticePeriod = 'Hoy' | 'Esta semana' | 'Anterior';

export const NOTICE_PERIODS: NoticePeriod[] = ['Hoy', 'Esta semana', 'Anterior'];

export interface NoticeItem {
  id: string;
  type: NotificationType;
  period: NoticePeriod;
  icon: string;
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

const ICON_BY_TYPE: Record<NotificationType, string> = {
  MATCHDAY_CLOSING_SOON: 'reloj',
  MATCHDAY_FINISHED: 'futbol',
  BADGE_EARNED: 'medalla',
  REENGAGEMENT: 'campana',
  LEVEL_UP: 'corona',
};

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoy" el mismo día natural; "Esta semana" hasta 6 días atrás; el resto, "Anterior" (sin fecha límite: el backend ya limita a los últimos 50 avisos). */
function periodFor(createdAt: Date, now: Date): NoticePeriod {
  if (isSameDay(createdAt, now)) return 'Hoy';
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays < 7 ? 'Esta semana' : 'Anterior';
}

/** "Hace 12 min" / "Hace 2 h" el mismo día; nombre del día entre semana; fecha corta más allá. */
function timeLabel(createdAt: Date, now: Date): string {
  const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60_000);
  if (isSameDay(createdAt, now)) {
    if (diffMinutes < 1) return 'Ahora mismo';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    return `Hace ${Math.floor(diffMinutes / 60)} h`;
  }
  const diffDays = Math.floor(diffMinutes / (60 * 24));
  if (diffDays < 7) {
    const weekday = createdAt.toLocaleDateString('es-ES', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }
  return createdAt.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

export function toNoticeItem(notification: AppNotification, now: Date): NoticeItem {
  const createdAt = new Date(notification.createdAt);
  return {
    id: notification.id,
    type: notification.type,
    period: periodFor(createdAt, now),
    icon: ICON_BY_TYPE[notification.type],
    title: notification.title,
    body: notification.body,
    time: timeLabel(createdAt, now),
    unread: notification.readAt == null,
  };
}
