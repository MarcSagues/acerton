import { AppNotification, NotificationType } from '../../../core/models/notification.model';
import { currentLocale, t } from '../../../core/i18n/translate';

/** Identificadores internos (no texto): el rotulo que se ve sale de noticePeriodLabel. */
export type NoticePeriod = 'today' | 'week' | 'older';

export const NOTICE_PERIODS: NoticePeriod[] = ['today', 'week', 'older'];

export function noticePeriodLabel(period: NoticePeriod): string {
  return t(period === 'today' ? 'currentMatchday.hoy' : period === 'week' ? 'notice.estaSemana' : 'notice.anterior');
}

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
  if (isSameDay(createdAt, now)) return 'today';
  const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (24 * 60 * 60 * 1000));
  return diffDays < 7 ? 'week' : 'older';
}

/** "Hace 12 min" / "Hace 2 h" el mismo día; nombre del día entre semana; fecha corta más allá. */
function timeLabel(createdAt: Date, now: Date): string {
  const diffMinutes = Math.floor((now.getTime() - createdAt.getTime()) / 60_000);
  if (isSameDay(createdAt, now)) {
    if (diffMinutes < 1) return t('notice.ahoraMismo');
    if (diffMinutes < 60) return t('notice.haceMin', { minutes: diffMinutes });
    return t('notice.haceHoras', { hours: Math.floor(diffMinutes / 60) });
  }
  const diffDays = Math.floor(diffMinutes / (60 * 24));
  if (diffDays < 7) {
    const weekday = createdAt.toLocaleDateString(currentLocale(), { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }
  return createdAt.toLocaleDateString(currentLocale(), { day: '2-digit', month: '2-digit' });
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
