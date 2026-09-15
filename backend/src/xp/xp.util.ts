/**
 * Catalogo de XP y curva de nivel (Sprint 14, roadmap). Mismos valores que
 * el boton de info de la pantalla de nivel (frontend
 * level-progress.domain.ts) — si se cambian aqui, cambiar tambien alli.
 *
 * Orden de valor (de mas a menos), tal y como lo definio el usuario:
 * pleno de jornada resultado exacto > pleno de jornada 1X2 > referido
 * (todavia sin construir, ver roadmap) > acierto resultado exacto >
 * acierto 1X2 = acierto ganador en resultado exacto > acierto con
 * comodin en 1X2 > participar.
 */
export const XP_VALUES = {
  PARTICIPATION: 5,
  WIN_1X2: 25,
  WIN_1X2_WILDCARD: 15,
  EXACT_SCORE_WINNER: 25,
  EXACT_SCORE_HIT: 60,
  PERFECT_MATCHDAY_1X2: 130,
  PERFECT_MATCHDAY_EXACT: 150,
} as const;

const MAX_LEVEL = 18;

/** XP necesaria para completar el nivel n. Misma formula que xpForLevel en el frontend. */
export function xpForLevel(n: number): number {
  return 200 + (n - 1) * 150;
}

export interface XpProgress {
  /** Nivel actual, topado en MAX_LEVEL (todavia no hay recompensas definidas mas alla). */
  level: number;
  /** XP dentro del nivel actual (no el total acumulado — la barra de progreso es por nivel, no global). */
  currentLevelXp: number;
  /** XP que hace falta completar en el nivel actual. */
  neededForLevel: number;
}

/** Deriva nivel y progreso dentro de ese nivel a partir de la XP total acumulada (nunca baja, ver User.experience). */
export function xpProgressForLevel(totalXp: number): XpProgress {
  let level = 1;
  let remaining = totalXp;
  while (level < MAX_LEVEL && remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  return { level, currentLevelXp: remaining, neededForLevel: xpForLevel(level) };
}
