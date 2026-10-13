export interface NotificationPreferences {
  matchdayOpening: boolean;
  reminder24h: boolean;
  reminder5h: boolean;
  reminder1h: boolean;
  reminder30m: boolean;
  matchFinishedPoints: boolean;
  matchdayFinishedResult: boolean;
  badgeEarned: boolean;
  seasonFinishedTrophies: boolean;
  reengagement: boolean;
  levelUp: boolean;
  quizOpening: boolean;
  quizReminder24h: boolean;
  quizReminder1h: boolean;
  groups: { groupId: string; name: string; muted: boolean }[];
}

export type NotificationPreferenceKey = Exclude<keyof NotificationPreferences, 'groups'>;
