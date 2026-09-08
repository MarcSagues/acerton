import { PredictionChoice } from './matchday.model';

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
  pointsEarned: number | null;
  submittedAt: string;
  user?: { id: string; name: string; avatarUrl: string | null };
}

export interface SubmitPredictionPayload {
  matchId: string;
  choice?: PredictionChoice;
  doubleChanceOption?: DoubleChanceOption;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
}
