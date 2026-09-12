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
  /** Creador del grupo: control total, distinto de GroupRole.ADMIN. */
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  _count?: { memberships: number };
  groupCompetitions?: GroupCompetition[];
  /** Tu posicion en la clasificacion general (TOTAL) de este grupo, o null si todavia no hay ninguna calculada. Solo viene informado en /groups/mine. */
  myPosition?: { position: number; points: number } | null;
}

export type GroupRole = 'ADMIN' | 'MEMBER';

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: GroupRole;
  joinedAt: string;
  user: { id: string; name: string; avatarUrl: string | null; avatarBackground: string | null };
}
