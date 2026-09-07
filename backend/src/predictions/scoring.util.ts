import { DoubleChanceOption, PredictionChoice } from '@prisma/client';

export interface ScorablePrediction {
  choice: PredictionChoice | null;
  doubleChanceOption: DoubleChanceOption | null;
}

const DOUBLE_CHANCE_COVERAGE: Record<DoubleChanceOption, PredictionChoice[]> = {
  HOME_OR_DRAW: ['HOME', 'DRAW'],
  DRAW_OR_AWAY: ['DRAW', 'AWAY'],
  HOME_OR_AWAY: ['HOME', 'AWAY'],
};

/**
 * 1 punto por acertar el 1X2, 0 si falla o el partido no ha terminado.
 * Comodin de remontada (DOUBLE_CHANCE): la prediccion cubre 2 de los 3
 * resultados posibles (1X, X2 o 12) en vez de uno solo; vale 1 punto si
 * acierta, igual que un acierto normal — la ventaja esta en la mayor
 * probabilidad de acertar, no en el valor del punto.
 */
export function calculatePoints(
  prediction: ScorablePrediction,
  result: PredictionChoice | null,
): number {
  if (result === null) {
    return 0;
  }

  if (prediction.doubleChanceOption) {
    const hits = DOUBLE_CHANCE_COVERAGE[prediction.doubleChanceOption].includes(result);
    return hits ? 1 : 0;
  }

  return prediction.choice === result ? 1 : 0;
}
