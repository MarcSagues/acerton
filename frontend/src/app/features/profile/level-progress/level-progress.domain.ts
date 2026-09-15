export type LevelRewardKind = 'color' | 'mascot';

export interface LevelReward {
  n: number;
  reward: string;
  kind: LevelRewardKind;
  /** Solo para kind 'color': el swatch a pintar. */
  swatch?: string;
}

export type LevelTier = 'Bronce' | 'Plata' | 'Oro';

export const TIER_NAMES: LevelTier[] = ['Bronce', 'Plata', 'Oro'];
const LEVELS_PER_TIER = 6;

export const RANKS = ['Aprendiz', 'Analista', 'Estratega', 'Oráculo', 'Leyenda'];

/**
 * Catálogo de niveles: mientras no exista el modelo real de XP (roadmap
 * Sprint 14, backend todavía sin construir), esto es un dato de muestra
 * fijo para poder disenar/probar la pantalla — igual que trophies.ts hizo
 * antes de tener modelo de trofeos. Ver "Vista de demostración" en la
 * plantilla.
 */
export const LEVEL_REWARDS: LevelReward[] = [
  { n: 1, reward: 'Avatar carbón', kind: 'color', swatch: '#3f484d' },
  { n: 2, reward: 'Marco bronce', kind: 'color', swatch: '#9a6f45' },
  { n: 3, reward: 'Mascota búho', kind: 'mascot' },
  { n: 4, reward: 'Avatar oliva', kind: 'color', swatch: '#7d8a5c' },
  { n: 5, reward: 'Icono de gol', kind: 'mascot' },
  { n: 6, reward: 'Marco humo', kind: 'color', swatch: '#5a6468' },
  { n: 7, reward: 'Avatar champán', kind: 'color', swatch: '#d2be94' },
  { n: 8, reward: 'Mascota zorro', kind: 'mascot' },
  { n: 9, reward: 'Tema menta', kind: 'color', swatch: '#91c7ae' },
  { n: 10, reward: 'Marco coral', kind: 'color', swatch: '#f1a4aa' },
  { n: 11, reward: 'Mascota toro', kind: 'mascot' },
  { n: 12, reward: 'Avatar índigo', kind: 'color', swatch: '#7b86c4' },
  { n: 13, reward: 'Tema dorado', kind: 'color', swatch: '#e3bd75' },
  { n: 14, reward: 'Mascota águila', kind: 'mascot' },
  { n: 15, reward: 'Marco élite', kind: 'color', swatch: '#d2be94' },
  { n: 16, reward: 'Avatar prisma', kind: 'color', swatch: '#b7c3c7' },
  { n: 17, reward: 'Mascota dragón', kind: 'mascot' },
  { n: 18, reward: 'Tema leyenda', kind: 'color', swatch: '#d2be94' },
];

export interface XpRule {
  title: string;
  note: string;
  xp: string;
  tone: 'accent' | 'warning' | 'success' | 'muted';
}

export interface XpGroup {
  title: string;
  rules: XpRule[];
}

/** Texto del botón de info — mismos valores que se acordaron para el Sprint 14 del roadmap. */
export const XP_GROUPS: XpGroup[] = [
  {
    title: 'ACIERTOS',
    rules: [
      { title: 'Ganador correcto', note: '1X2 acertado', xp: '+25 XP', tone: 'accent' },
      { title: 'Resultado exacto', note: 'Marcador clavado', xp: '+60 XP', tone: 'warning' },
      { title: 'Pleno de jornada', note: 'Todos los partidos', xp: '+150 XP', tone: 'success' },
    ],
  },
  {
    title: 'CONSTANCIA',
    rules: [
      { title: 'Racha de 5 aciertos', note: 'Se acumula por racha', xp: '+80 XP', tone: 'accent' },
      { title: 'Entrar cada día', note: 'Una vez al día', xp: '+10 XP', tone: 'muted' },
    ],
  },
  {
    title: 'COMUNIDAD',
    rules: [
      { title: 'Invitar a un amigo', note: 'Al hacer su 1er pronóstico', xp: '+100 XP', tone: 'success' },
      { title: 'Ganar una liga privada', note: 'Al cerrar la temporada', xp: '+200 XP', tone: 'warning' },
    ],
  },
];

/** XP necesaria para completar el nivel n (curva de muestra, a definir de verdad en el Sprint 14). */
export function xpForLevel(n: number): number {
  return 200 + (n - 1) * 150;
}

export function tierIndexOfLevel(n: number): number {
  return Math.min(TIER_NAMES.length - 1, Math.floor((n - 1) / LEVELS_PER_TIER));
}

export function tierRangeLabel(tierIndex: number): string {
  const start = tierIndex * LEVELS_PER_TIER + 1;
  const end = start + LEVELS_PER_TIER - 1;
  return `${TIER_NAMES[tierIndex]} · ${start}-${end}`;
}

export function rankForLevel(n: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((n - 1) / 4))];
}
