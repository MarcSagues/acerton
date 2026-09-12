import { GroupRole } from './group.model';

export interface MemberBadge {
  id: string;
  earnedAt: string;
  badge: { id: string; code: string; name: string; description: string };
}

export interface MemberRecentMatchday {
  matchdayId: string;
  order: number;
  points: number;
  position: number;
}

export interface MemberProfile {
  userId: string;
  name: string;
  role: GroupRole;
  joinedAt: string;
  streak: { currentStreak: number; longestStreak: number };
  /** null si el usuario todavia no tiene ninguna prediccion puntuada. */
  hitRate: number | null;
  badges: MemberBadge[];
  recentMatchdays: MemberRecentMatchday[];
}
