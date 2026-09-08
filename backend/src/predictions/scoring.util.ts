import { DoubleChanceOption, PredictionChoice } from '@prisma/client';
import { computeMatchResult } from '../matchdays/matchday.util';

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

export interface ScorableExactScorePrediction {
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
}

/**
 * Puntuacion en modo "Resultado exacto": 5 puntos por marcador exacto, 2 por
 * acertar solo el resultado (1X2 — el empate cuenta como acierto de
 * resultado aunque el marcador no coincida), 0 en cualquier otro caso o si
 * falta algun dato (partido sin terminar o prediccion incompleta).
 */
export function calculateExactScorePoints(
  prediction: ScorableExactScorePrediction,
  actualHomeScore: number | null,
  actualAwayScore: number | null,
): number {
  if (
    prediction.predictedHomeScore == null ||
    prediction.predictedAwayScore == null ||
    actualHomeScore == null ||
    actualAwayScore == null
  ) {
    return 0;
  }

  if (prediction.predictedHomeScore === actualHomeScore && prediction.predictedAwayScore === actualAwayScore) {
    return 5;
  }

  const predictedOutcome = computeMatchResult(prediction.predictedHomeScore, prediction.predictedAwayScore);
  const actualOutcome = computeMatchResult(actualHomeScore, actualAwayScore);
  return predictedOutcome === actualOutcome ? 2 : 0;
}
