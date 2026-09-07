export interface StreakState {
  currentStreak: number;
  longestStreak: number;
}

/**
 * Logica pura de la racha: si el usuario participo (envio >=1 prediccion)
 * en la jornada que se acaba de cerrar, la racha sube en 1; si no, se rompe
 * y vuelve a 0. La racha mas larga solo puede crecer.
 */
export function computeNextStreak(state: StreakState, participated: boolean): StreakState {
  const currentStreak = participated ? state.currentStreak + 1 : 0;
  const longestStreak = Math.max(state.longestStreak, currentStreak);
  return { currentStreak, longestStreak };
}
