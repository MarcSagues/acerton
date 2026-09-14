import { CompetitionCode } from './competition.model';
import { ScoringMode } from './group.model';

export interface PublicGroupCompetitionSummary {
  id: string;
  code: CompetitionCode;
  name: string;
  logoUrl: string | null;
}

export interface PublicGroupSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  scoringMode: ScoringMode;
  comebackEnabled: boolean;
  createdAt: string;
  competitions: PublicGroupCompetitionSummary[];
  /** Si el usuario actual ya pertenece a este grupo: "Unirme" pasa a "Unido" y deshabilitado. */
  isMember: boolean;
}

export interface PublicGroupsPage {
  items: PublicGroupSummary[];
  nextCursor: string | null;
}

export interface PublicGroupPreviewRankingRow {
  userId: string;
  name: string;
  position: number;
  points: number;
}

export interface PublicGroupPreview extends PublicGroupSummary {
  /** Null salvo modo 1X2 con el comodin activo. */
  comebackPointsPerBonus: number | null;
  topRanking: PublicGroupPreviewRankingRow[];
}
