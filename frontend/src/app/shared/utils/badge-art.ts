/**
 * Traduce el `code` real de una insignia (backend, ver prisma/seed.ts) al
 * identificador de arte de Piqo Mobile 4.0 (assets/art.js, PIQO_ART.badges) —
 * los 5 motivos son fijos y no alterables por diseño (HANDOFF §18).
 */
const BADGE_ART_BY_CODE: Record<string, string> = {
  FIRST_MATCHDAY_PLAYED: 'primeros-pasos',
  HOT_STREAK_5: 'en-racha',
  MATCHDAY_TOP_1: 'jornada-perfecta',
  STREAK_5: 'racha-5',
  STREAK_10: 'racha-10',
};

export function badgeArtId(code: string): string | null {
  return BADGE_ART_BY_CODE[code] ?? null;
}
