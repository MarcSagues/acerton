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
  /** Ya tiene el comodin extra de esta jornada conseguido viendo un video. Siempre false si no se consulto con matchdayId. */
  adBonusClaimed: boolean;
  /** Podria conseguir ese comodin extra ahora mismo viendo un video. Siempre false si no se consulto con matchdayId. */
  adBonusAvailable: boolean;
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

/** Nivel y progreso de XP (Sprint 14, roadmap) — ver backend xp.util.ts. */
export interface XpProgress {
  level: number;
  /** XP dentro del nivel actual, no el total acumulado — la barra de progreso es por nivel. */
  currentLevelXp: number;
  neededForLevel: number;
}

export interface UserProfile {
  badges: UserBadge[];
  groups: GroupProfileSummary[];
  /** Racha global: cada jornada de cada competicion presente en los grupos del usuario cuenta una vez, sin duplicar. */
  globalStreak: Streak;
  xp: XpProgress;
}
