import { DoubleChanceOption, PredictionChoice, ScoringMode } from '@prisma/client';

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
 * Solo se copia entre grupos del MISMO modo de puntuacion (a peticion del
 * usuario): ni de 1X2 a resultado exacto (no hay marcador que copiar) ni de
 * resultado exacto a 1X2 (no se convierte un marcador en un 1/X/2).
 */
export function canCopyBetweenModes(source: ScoringMode, target: ScoringMode): boolean {
  return source === target;
}

/**
 * Convierte un pronostico del grupo de origen en lo que se enviaria al de
 * destino (los dos del mismo `mode`), o dice por que no se puede. Logica pura
 * (sin base de datos).
 *
 * El comodin de remontada es de cada grupo (depende de la diferencia con el
 * lider de ESE grupo, ver WildcardsService.getComebackStatus), asi que solo
 * se copia si `wildcardAvailable` — el que llama lo comprueba contra el grupo
 * de destino. Sin comodin disponible:
 *  - 1X2 con doble oportunidad (1X/X2/12): no hay un 1X2 simple equivalente,
 *    asi que se omite en vez de inventar una eleccion.
 *  - resultado exacto con "x2 puntos": se copia el marcador sin duplicador.
 */
export function planCopy(
  prediction: CopyablePrediction,
  mode: ScoringMode,
  wildcardAvailable: boolean,
): CopyPlan {
  if (mode === 'EXACT_SCORE') {
    const { predictedHomeScore: home, predictedAwayScore: away } = prediction;
    if (home === null || away === null) return { skip: 'FAILED' };

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
