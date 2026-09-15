export type NotificationType = 'MATCHDAY_CLOSING_SOON' | 'MATCHDAY_FINISHED' | 'BADGE_EARNED' | 'REENGAGEMENT' | 'LEVEL_UP';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  groupId: string | null;
  matchdayId: string | null;
  /** Solo para LEVEL_UP: el nivel alcanzado (Sprint 14). */
  level: number | null;
  readAt: string | null;
  createdAt: string;
}
