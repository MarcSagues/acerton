import { PredictionChoice } from './matchday.model';
import { ScoringMode } from './group.model';

export type DoubleChanceOption = 'HOME_OR_DRAW' | 'DRAW_OR_AWAY' | 'HOME_OR_AWAY';

export interface Prediction {
  id: string;
  userId: string;
  groupId: string;
  matchId: string;
  choice: PredictionChoice | null;
  doubleChanceOption: DoubleChanceOption | null;
  /** Solo en grupos de modo EXACT_SCORE. */
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  /** Comodin de remontada en grupos EXACT_SCORE: duplica los puntos de este partido (equivalente a doubleChanceOption en 1X2). */
  doublePointsWildcard: boolean;
  pointsEarned: number | null;
  submittedAt: string;
  user?: { id: string; name: string; avatarUrl: string | null; avatarBackground: string | null; level?: number };
}

export interface SubmitPredictionPayload {
  matchId: string;
  choice?: PredictionChoice;
  doubleChanceOption?: DoubleChanceOption;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  doublePointsWildcard?: boolean;
}

/** Por que no se puede copiar de un grupo en el que si has marcado pronosticos de esa jornada. */
export type CopyUnavailableReason = 'DIFFERENT_MODE' | 'ALL_STARTED';

/** Otro grupo tuyo con pronosticos de la jornada abierta (GET .../predictions/copy-sources/:matchdayId). */
export interface CopySource {
  groupId: string;
  name: string;
  scoringMode: ScoringMode;
  /** Cuantos de sus pronosticos de esa jornada siguen abiertos (los de partidos ya empezados no se copian). */
  copyableCount: number;
  /** null = se puede copiar. Si no, el motivo: otro modo de juego (1X2 / resultado exacto) o todos sus partidos ya han empezado. */
  unavailable: CopyUnavailableReason | null;
}

export type CopySkipReason = 'LOCKED' | 'WILDCARD_UNAVAILABLE' | 'FAILED';

export interface CopyResult {
  /** Pronosticos ya guardados en el grupo actual. */
  copied: Prediction[];
  skipped: { matchId: string; reason: CopySkipReason }[];
  /** Partidos copiados SIN el comodin que tenian en el grupo de origen. */
  wildcardsDropped: string[];
}
