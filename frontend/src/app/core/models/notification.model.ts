export type NotificationType = 'MATCHDAY_CLOSING_SOON' | 'MATCHDAY_FINISHED' | 'BADGE_EARNED' | 'REENGAGEMENT';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  groupId: string | null;
  matchdayId: string | null;
  readAt: string | null;
  createdAt: string;
}
