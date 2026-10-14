import { t } from '../../../core/i18n/translate';
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

export const RANKS = [t('levelProgress.aprendiz'), t('levelProgress.analista'), t('levelProgress.estratega'), t('levelProgress.oraculo'), t('levelProgress.leyenda')];

export function mascotAssetPath(mascotId: string): string {
  return `/assets/avatars/mascot/${mascotId}.png`;
}

/**
 * Que nivel hace falta para poder elegir este color/mascota en
 * `/profile/avatar` (Sprint 14, gating real por nivel). El champán y
 * 'reposo' (avatar "de fábrica", nunca en LEVEL_REWARDS) devuelven 1,
 * igual que 'tristeza' (mascota normal que quedó fuera del catálogo de
 * 18 premios por diseño) — siempre disponibles. Mismo criterio que el
 * backend (`users/avatar-level-rewards.ts`, duplicado a propósito).
 */
export function levelRequiredForBackground(swatch: string): number {
  return LEVEL_REWARDS.find((r) => r.kind === 'color' && r.swatch === swatch)?.n ?? 1;
}

export function levelRequiredForMascot(mascotId: string): number {
  return LEVEL_REWARDS.find((r) => r.kind === 'mascot' && r.mascotId === mascotId)?.n ?? 1;
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
  { n: 1, reward: t('levelProgress.temaGrafito'), kind: 'color', swatch: '#3a3f44' },
  { n: 2, reward: t('levelProgress.mascotaSaludo'), kind: 'mascot', mascotId: 'saludo' },
  { n: 3, reward: t('levelProgress.temaSalvia'), kind: 'color', swatch: '#7c9473' },
  { n: 4, reward: t('levelProgress.mascotaGuino'), kind: 'mascot', mascotId: 'guino' },
  { n: 5, reward: t('levelProgress.mascotaSorpresa'), kind: 'mascot', mascotId: 'sorpresa' },
  { n: 6, reward: t('levelProgress.temaAzulApagado'), kind: 'color', swatch: '#6a8caf' },
  { n: 7, reward: t('levelProgress.mascotaPensativa'), kind: 'mascot', mascotId: 'pensando' },
  { n: 8, reward: t('levelProgress.temaArcilla'), kind: 'color', swatch: '#c98a8a' },
  { n: 9, reward: t('levelProgress.mascotaSentada'), kind: 'mascot', mascotId: 'sentado' },
  { n: 10, reward: t('levelProgress.mascotaAdormilada'), kind: 'mascot', mascotId: 'sueno' },
  { n: 11, reward: t('levelProgress.temaTerracota'), kind: 'color', swatch: '#c0704f' },
  { n: 12, reward: t('levelProgress.mascotaEnfadada'), kind: 'mascot', mascotId: 'enfado' },
  { n: 13, reward: t('levelProgress.temaCiruela'), kind: 'color', swatch: '#8a6a8a' },
  { n: 14, reward: t('levelProgress.mascotaRisuena'), kind: 'mascot', mascotId: 'risa' },
  { n: 15, reward: t('levelProgress.mascotaBalon'), kind: 'mascot', mascotId: 'abrazo-balon' },
  { n: 16, reward: t('levelProgress.temaMostaza'), kind: 'color', swatch: '#b98d3e' },
  { n: 17, reward: t('levelProgress.mascotaCorriendo'), kind: 'mascot', mascotId: 'corriendo' },
  { n: 18, reward: t('levelProgress.mascotaCampeona'), kind: 'mascot', mascotId: 'celebrando' },
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
    title: t('levelProgress.grupoAciertos'),
    rules: [
      { title: t('levelProgress.ganadorCorrecto'), note: t('levelProgress.1x2ResultadoExacto'), xp: '+25 XP', tone: 'accent' },
      { title: t('levelProgress.aciertoComodin1x2'), note: t('levelProgress.dobleOportunidad'), xp: '+15 XP', tone: 'muted' },
      { title: t('common.resultadoExacto'), note: t('levelProgress.marcadorClavado'), xp: '+60 XP', tone: 'warning' },
      { title: t('levelProgress.plenoGanadores'), note: t('levelProgress.todosPartidos1x2Resultado'), xp: '+600 XP', tone: 'success' },
      { title: t('levelProgress.plenoResultadoExacto'), note: t('levelProgress.marcadorClavadoTodosPartidos'), xp: '+1000 XP', tone: 'success' },
    ],
  },
  {
    title: t('levelProgress.participacion'),
    rules: [{ title: t('levelProgress.pronosticar'), note: t('levelProgress.cadaPartidoEnviarloPrimera'), xp: '+5 XP', tone: 'muted' }],
  },
  {
    title: t('levelProgress.grupoReferidos'),
    rules: [
      { title: t('levelProgress.invitarAmigo'), note: t('levelProgress.enlazarCodigoCuentaBaja'), xp: '+500 XP', tone: 'accent' },
    ],
  },
];

/** XP necesaria para completar el nivel n. */
export function xpForLevel(n: number): number {
  return 200 + (n - 1) * 150;
}

export function rankForLevel(n: number): string {
  return RANKS[Math.min(RANKS.length - 1, Math.floor((n - 1) / 4))];
}
