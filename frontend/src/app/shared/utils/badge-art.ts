/**
 * Traduce el `code` real de una insignia (backend, ver prisma/seed.ts) al
 * identificador de su arte. Los 5 primeros motivos son de Piqo Mobile 4.0
 * (assets/art.js, PIQO_ART.badges — fijos por diseño, HANDOFF §18) y tienen
 * PNG 3D + WebP animado; las otras 15 son SVG vectoriales sueltos
 * (public/piqo/insignias/svg), sin versión animada.
 */
const BADGE_ART_BY_CODE: Record<string, string> = {
  FIRST_MATCHDAY_PLAYED: 'primeros-pasos',
  HOT_STREAK_5: 'en-racha',
  MATCHDAY_TOP_1: 'jornada-perfecta',
  STREAK_5: 'racha-5',
  STREAK_10: 'racha-10',
  STREAK_25: 'streak-25',
  HOT_STREAK_10: 'hot-streak-10',
  PREDICTIONS_100: 'predictions-100',
  PREDICTIONS_500: 'predictions-500',
  ONE_X_TWO_HITS_25: 'one-x-two-hits-25',
  ONE_X_TWO_HITS_100: 'one-x-two-hits-100',
  EXACT_SCORE_HIT_1: 'exact-score-hit-1',
  EXACT_SCORE_HITS_10: 'exact-score-hits-10',
  PERFECT_MATCHDAY: 'perfect-matchday',
  WILDCARD_HITS_5: 'wildcard-hits-5',
  GROUPS_JOINED_3: 'groups-joined-3',
  DRAW_HITS_10: 'draw-hits-10',
  COMPETITIONS_3: 'competitions-3',
  GROUP_FOUNDER: 'group-founder',
  PODIUM_5: 'podium-5',
};

const LEGACY_ART_IDS = new Set(['primeros-pasos', 'en-racha', 'jornada-perfecta', 'racha-5', 'racha-10']);

export function badgeArtId(code: string): string | null {
  return BADGE_ART_BY_CODE[code] ?? null;
}

/** Imagen estática de la insignia (PNG 3D las 5 originales, SVG el resto). */
export function badgeArtSrc(artId: string): string {
  return LEGACY_ART_IDS.has(artId) ? `/piqo/insignias/3d/${artId}.png` : `/piqo/insignias/svg/${artId}.svg`;
}

/** WebP animado, solo para las 5 originales; null si la insignia no tiene versión animada. */
export function badgeAnimatedSrc(artId: string): string | null {
  return LEGACY_ART_IDS.has(artId) ? `/piqo/insignias/animadas/${artId}.webp` : null;
}
