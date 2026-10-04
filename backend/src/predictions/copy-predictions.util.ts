import { DoubleChanceOption, PredictionChoice, ScoringMode } from '@prisma/client';
import { computeMatchResult } from '../matchdays/matchday.util';

/** Por que un pronostico del grupo de origen no se ha copiado al de destino. */
export type CopySkipReason = 'LOCKED' | 'WILDCARD_UNAVAILABLE' | 'FAILED';

/** Lo minimo de un pronostico ya guardado que hace falta para copiarlo. */
export interface CopyablePrediction {
  choice: PredictionChoice | null;
  doubleChanceOption: DoubleChanceOption | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  doublePointsWildcard: boolean;
}

/** Cuerpo equivalente a SubmitPredictionDto (sin matchId) que se enviaria al grupo de destino. */
export interface CopiedSubmission {
  choice?: PredictionChoice;
  doubleChanceOption?: DoubleChanceOption;
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  doublePointsWildcard?: boolean;
}

export type CopyPlan =
  | { submission: CopiedSubmission; wildcardDropped: boolean }
  | { skip: Exclude<CopySkipReason, 'LOCKED'> };

/**
 * De un marcador (resultado exacto) a un 1X2 si, y solo si, el destino es un
 * grupo 1X2. Al reves no hay conversion posible: un "1" no dice cuantos goles.
 */
export function canCopyBetweenModes(source: ScoringMode, target: ScoringMode): boolean {
  return source === target || (source === 'EXACT_SCORE' && target === 'ONE_X_TWO');
}

/**
 * Convierte un pronostico del grupo de origen en lo que se enviaria al de
 * destino, o dice por que no se puede. Logica pura (sin base de datos).
 *
 * El comodin de remontada es de cada grupo (depende de la diferencia con el
 * lider de ESE grupo, ver WildcardsService.getComebackStatus), asi que solo
 * se copia si `wildcardAvailable` — el que llama lo comprueba contra el grupo
 * de destino. Sin comodin disponible:
 *  - 1X2 con doble oportunidad (1X/X2/12): no hay un 1X2 simple equivalente,
 *    asi que se omite en vez de inventar una eleccion.
 *  - resultado exacto con "x2 puntos": se copia el marcador sin duplicador.
 * De un grupo de resultado exacto a uno 1X2 el 1X2 sale del marcador y el
 * "x2 puntos" no tiene equivalente (se descarta).
 */
export function planCopy(
  prediction: CopyablePrediction,
  sourceMode: ScoringMode,
  targetMode: ScoringMode,
  wildcardAvailable: boolean,
): CopyPlan {
  const { predictedHomeScore: home, predictedAwayScore: away } = prediction;

  if (sourceMode === 'EXACT_SCORE') {
    if (home === null || away === null) return { skip: 'FAILED' };

    if (targetMode === 'ONE_X_TWO') {
      const choice = computeMatchResult(home, away);
      if (!choice) return { skip: 'FAILED' };
      return { submission: { choice }, wildcardDropped: prediction.doublePointsWildcard };
    }

    const keepWildcard = prediction.doublePointsWildcard && wildcardAvailable;
    return {
      submission: {
        predictedHomeScore: home,
        predictedAwayScore: away,
        doublePointsWildcard: keepWildcard,
      },
      wildcardDropped: prediction.doublePointsWildcard && !keepWildcard,
    };
  }

  // Origen 1X2: solo se puede copiar a otro grupo 1X2.
  if (targetMode !== 'ONE_X_TWO') return { skip: 'FAILED' };
  if (prediction.doubleChanceOption) {
    return wildcardAvailable
      ? {
          submission: { doubleChanceOption: prediction.doubleChanceOption },
          wildcardDropped: false,
        }
      : { skip: 'WILDCARD_UNAVAILABLE' };
  }
  if (prediction.choice) {
    return { submission: { choice: prediction.choice }, wildcardDropped: false };
  }
  return { skip: 'FAILED' };
}
