export type LevelRewardKind = 'color' | 'mascot';

export interface LevelReward {
  n: number;
  reward: string;
  kind: LevelRewardKind;
  /** Solo para kind 'color': el swatch a pintar. */
  swatch?: string;
  /** Solo para kind 'mascot': id real del catálogo (ver backend avatar-catalog.ts DEFAULT_MASCOT_IDS), para poder pintar la miniatura de verdad en vez de un icono generico. */
  mascotId?: string;
}

export type LevelTier = 'Bronce' | 'Plata' | 'Oro';

export const TIER_NAMES: LevelTier[] = ['Bronce', 'Plata', 'Oro'];
const LEVELS_PER_TIER = 6;

export const RANKS = ['Aprendiz', 'Analista', 'Estratega', 'Oráculo', 'Leyenda'];

export function mascotAssetPath(mascotId: string): string {
  return `/assets/avatars/mascot/${mascotId}.png`;
}

/**
 * Catálogo de recompensas por nivel: alterna colores y mascotas del
 * catálogo real (backend avatar-catalog.ts), de menos a más vistoso — se
 * excluyen a propósito 'reposo' (mascota) y el champán (#d2be94), porque
 * son el avatar "de fábrica" que ya tiene toda cuenta nueva, no algo que
 * tenga sentido "desbloquear". El nivel en sí y la XP ya son reales (ver
 * facade); lo que sigue siendo de muestra es que el nivel todavía no
 * "desbloquea" nada de verdad en /profile/avatar (el catálogo de ahí es
 * libre para cualquier cuenta) — pendiente conectar el gating real, ver
 * roadmap.md Sprint 14.
 */
export const LEVEL_REWARDS: LevelReward[] = [
  { n: 1, reward: 'Tema grafito', kind: 'color', swatch: '#3a3f44' },
  { n: 2, reward: 'Mascota saludo', kind: 'mascot', mascotId: 'saludo' },
  { n: 3, reward: 'Tema salvia', kind: 'color', swatch: '#7c9473' },
  { n: 4, reward: 'Mascota guiño', kind: 'mascot', mascotId: 'guino' },
  { n: 5, reward: 'Mascota sorpresa', kind: 'mascot', mascotId: 'sorpresa' },
  { n: 6, reward: 'Tema azul apagado', kind: 'color', swatch: '#6a8caf' },
  { n: 7, reward: 'Mascota pensativa', kind: 'mascot', mascotId: 'pensando' },
  { n: 8, reward: 'Tema arcilla', kind: 'color', swatch: '#c98a8a' },
  { n: 9, reward: 'Mascota sentada', kind: 'mascot', mascotId: 'sentado' },
  { n: 10, reward: 'Mascota adormilada', kind: 'mascot', mascotId: 'sueno' },
  { n: 11, reward: 'Tema terracota', kind: 'color', swatch: '#c0704f' },
  { n: 12, reward: 'Mascota enfadada', kind: 'mascot', mascotId: 'enfado' },
  { n: 13, reward: 'Tema ciruela', kind: 'color', swatch: '#8a6a8a' },
  { n: 14, reward: 'Mascota risueña', kind: 'mascot', mascotId: 'risa' },
  { n: 15, reward: 'Mascota con balón', kind: 'mascot', mascotId: 'abrazo-balon' },
  { n: 16, reward: 'Tema mostaza', kind: 'color', swatch: '#b98d3e' },
  { n: 17, reward: 'Mascota corriendo', kind: 'mascot', mascotId: 'corriendo' },
  { n: 18, reward: 'Mascota campeona', kind: 'mascot', mascotId: 'celebrando' },
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

/** Texto del botón de info — mismos valores reales que XP_VALUES en el backend (ver xp.util.ts). */
export const XP_GROUPS: XpGroup[] = [
  {
    title: 'ACIERTOS',
    rules: [
      { title: 'Ganador correcto', note: '1X2 o resultado exacto', xp: '+25 XP', tone: 'accent' },
      { title: 'Acierto con comodín en 1X2', note: 'Doble oportunidad', xp: '+15 XP', tone: 'muted' },
      { title: 'Resultado exacto', note: 'Marcador clavado', xp: '+60 XP', tone: 'warning' },
      { title: 'Pleno de jornada (1X2)', note: 'Todos los partidos', xp: '+130 XP', tone: 'success' },
      { title: 'Pleno de jornada (resultado exacto)', note: 'Todos los partidos', xp: '+150 XP', tone: 'success' },
    ],
  },
  {
    title: 'PARTICIPACIÓN',
    rules: [{ title: 'Pronosticar', note: 'Por cada jornada jugada', xp: '+5 XP', tone: 'muted' }],
  },
  {
    title: 'PRÓXIMAMENTE',
    rules: [{ title: 'Invitar a un amigo', note: 'Al hacer su 1er pronóstico', xp: 'Próximamente', tone: 'muted' }],
  },
];

/** XP necesaria para completar el nivel n. */
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
