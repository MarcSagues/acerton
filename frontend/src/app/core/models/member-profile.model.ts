import { GroupRole, ScoringMode } from './group.model';
import { MatchdayStatus } from './matchday.model';

export interface MemberBadge {
  id: string;
  earnedAt: string;
  badge: { id: string; code: string; name: string; description: string };
}

export interface MemberRecentMatchday {
  matchdayId: string;
  order: number;
  closesAt: string;
  points: number;
  position: number;
  competitionName: string;
  status: MatchdayStatus;
}

export interface MemberProfile {
  userId: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  role: GroupRole;
  joinedAt: string;
  /** El propietario del grupo, distinto de role (ver Group.ownerId). */
  isOwner: boolean;
  group: { id: string; name: string; scoringMode: ScoringMode };
  streak: { currentStreak: number; longestStreak: number };
  /** null si el usuario todavia no tiene ninguna prediccion puntuada. */
  hitRate: number | null;
  /** Denominador de hitRate: predicciones puntuadas, no jornadas (varios partidos por jornada). */
  scoredPredictionsCount: number;
  badges: MemberBadge[];
  recentMatchdays: MemberRecentMatchday[];
}
