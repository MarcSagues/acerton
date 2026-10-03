import { AvatarBackground, AvatarMascotId } from './avatar-catalog';

/**
 * Que nivel hace falta para poder elegir cada color/mascota "de premio"
 * del catalogo (Sprint 14, gamificacion por nivel). Mismos 18 valores que
 * LEVEL_REWARDS en el frontend (level-progress.domain.ts) — duplicado a
 * proposito, igual que xp.util.ts, para no compartir codigo entre
 * workspaces: si se cambia el catalogo alli, cambiar tambien aqui.
 *
 * El champan (#d2be94) y 'reposo' son el avatar "de fabrica" de toda
 * cuenta nueva y nunca estan aqui — siempre disponibles sin nivel. Lo
 * mismo para 'tristeza': quedo fuera del catalogo de 18 premios por
 * disenio (ver LEVEL_REWARDS), asi que tambien esta siempre disponible.
 * Las mascotas de trofeo (TROPHY_MASCOT_IDS) no pasan por aqui — su
 * candado es el trofeo correspondiente, no el nivel (ver
 * AVATAR_TROPHY_REQUIREMENT).
 */
const REQUIRED_LEVEL_BY_BACKGROUND: Partial<Record<AvatarBackground, number>> = {
  '#3a3f44': 1, // grafito
  '#7c9473': 3, // salvia
  '#6a8caf': 6, // azul apagado
  '#c98a8a': 8, // rosa arcilla
  '#c0704f': 11, // terracota
  '#8a6a8a': 13, // ciruela
  '#b98d3e': 16, // mostaza
};

const REQUIRED_LEVEL_BY_MASCOT: Partial<Record<AvatarMascotId, number>> = {
  saludo: 2,
  guino: 4,
  sorpresa: 5,
  pensando: 7,
  sentado: 9,
  sueno: 10,
  enfado: 12,
  risa: 14,
  'abrazo-balon': 15,
  corriendo: 17,
  celebrando: 18,
};

export function levelRequiredForBackground(background: AvatarBackground): number {
  return REQUIRED_LEVEL_BY_BACKGROUND[background] ?? 1;
}

export function levelRequiredForMascot(mascotId: AvatarMascotId): number {
  return REQUIRED_LEVEL_BY_MASCOT[mascotId] ?? 1;
}
