export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  iconUrl: string | null;
}

export interface UserBadge {
  id: string;
  earnedAt: string;
  matchdayId: string | null;
  badge: Badge;
  group: { id: string; name: string } | null;
}

export interface ComebackStatus {
  enabled: boolean;
  pointsPerBonus: number;
  gap: number;
  allowance: number;
  used: number;
  remaining: number;
}

export interface Streak {
  currentStreak: number;
  longestStreak: number;
}

export interface GroupProfileSummary {
  group: { id: string; name: string };
  streak: Streak;
  comeback: ComebackStatus;
}

export interface UserProfile {
  badges: UserBadge[];
  groups: GroupProfileSummary[];
  /** Racha global: cada jornada de cada competicion presente en los grupos del usuario cuenta una vez, sin duplicar. */
  globalStreak: Streak;
}
