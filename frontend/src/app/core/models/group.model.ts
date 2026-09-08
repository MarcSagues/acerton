import { GroupCompetition } from './competition.model';

export type ScoringMode = 'ONE_X_TWO' | 'EXACT_SCORE';

export interface Group {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  inviteCode: string;
  comebackEnabled: boolean;
  comebackPointsPerBonus: number;
  /** Fijado al crear el grupo, no se puede cambiar despues. */
  scoringMode: ScoringMode;
  createdAt: string;
  updatedAt: string;
  _count?: { memberships: number };
  groupCompetitions?: GroupCompetition[];
}

export type GroupRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: GroupRole;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl: string | null };
}
