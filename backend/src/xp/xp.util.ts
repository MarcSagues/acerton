/**
 * Catalogo de XP y curva de nivel (Sprint 14, roadmap). Mismos valores que
 * el boton de info de la pantalla de nivel (frontend
 * level-progress.domain.ts) — si se cambian aqui, cambiar tambien alli.
 *
 * Orden de valor (de mas a menos), revisado el 2026-09-16 a peticion
 * explicita del usuario ("ganar completo debe ser un boost heavy... y mas
 * si es el de resultado exacto"): pleno con TODOS los marcadores exactos
 * (el mas dificil, solo modo resultado exacto) > pleno de ganadores (1X2 o
 * resultado exacto, sin exigir marcador exacto en todos) > referido (con
 * caida, ver xpForReferral) > acierto resultado exacto > acierto 1X2 =
 * acierto ganador en resultado exacto > acierto con comodin en 1X2 >
 * participar.
 */
export const XP_VALUES = {
  PARTICIPATION: 5,
  WIN_1X2: 25,
  WIN_1X2_WILDCARD: 15,
  EXACT_SCORE_WINNER: 25,
  EXACT_SCORE_HIT: 60,
  /** Pleno de ganadores: todos los partidos con puntos, sin exigir marcador exacto en todos (aplica igual en modo 1X2 y en modo resultado exacto). */
  PERFECT_MATCHDAY_1X2: 600,
  PERFECT_MATCHDAY_EXACT: 600,
  /** Pleno con el marcador exacto de TODOS los partidos (solo modo resultado exacto) — el nivel mas dificil y mas premiado. */
  PERFECT_MATCHDAY_ALL_EXACT: 1000,
} as const;

/** XP del primer referido (ver xpForReferral para la caida en los siguientes). */
export const REFERRAL_BASE_XP = 500;
/** Suelo al que converge la caida — nunca llega a 0, para que no compense crear cuentas falsas pero tampoco deje de dar nada. */
export const REFERRAL_FLOOR_XP = 10;

/**
 * XP que gana el referidor en su n-esimo referido (1 = primero). Cae a la
 * mitad en cada uno siguiente hasta tocar el suelo, donde se queda para
 * siempre (decision explicita del usuario, 2026-09-16): 500, 250, 125, 63,
 * 31, 16, 10, 10, 10...
 */
export function xpForReferral(referralIndex: number): number {
  const halved = REFERRAL_BASE_XP / 2 ** (referralIndex - 1);
  return Math.max(REFERRAL_FLOOR_XP, Math.round(halved));
}

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
