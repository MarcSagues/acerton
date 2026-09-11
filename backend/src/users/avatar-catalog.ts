/**
 * Catalogo cerrado de avatares "de fabrica" (product-rules.md § "Perfil y
 * avatares": catalogo de avatares predeterminados). Los 13 ids de mascota
 * corresponden 1:1 a los PNG en frontend/src/assets/avatars/mascot/<id>.png
 * (fondo transparente, 512x512, personaje centrado) — si se anade o quita
 * un fichero ahi, hay que reflejarlo aqui tambien.
 *
 * Restringido a un catalogo cerrado (en vez de aceptar cualquier URL/color)
 * porque todavia no existe subida de foto propia (requiere decidir
 * almacenamiento de imagenes, ver docs/quiniela/backlog.md) — esto evita
 * aceptar URLs o colores arbitrarios en el DTO mientras tanto.
 */
export const AVATAR_MASCOT_IDS = [
  'reposo',
  'saludo',
  'guino',
  'sorpresa',
  'risa',
  'tristeza',
  'enfado',
  'sueno',
  'sentado',
  'abrazo-balon',
  'celebrando',
  'corriendo',
  'pensando',
] as const;

export type AvatarMascotId = (typeof AVATAR_MASCOT_IDS)[number];

/** Paleta curada a juego con la marca (grafito/champan) — no son los tokens semanticos (--p4-success, etc.) para no mezclar significado funcional con personalizacion. */
export const AVATAR_BACKGROUNDS = [
  '#d2be94', // champan
  '#3a3f44', // grafito
  '#c0704f', // terracota
  '#7c9473', // salvia
  '#6a8caf', // azul apagado
  '#8a6a8a', // ciruela
  '#c98a8a', // rosa arcilla
  '#b98d3e', // mostaza
] as const;

export type AvatarBackground = (typeof AVATAR_BACKGROUNDS)[number];

export function mascotAssetPath(mascotId: AvatarMascotId): string {
  return `/assets/avatars/mascot/${mascotId}.png`;
}

/** El avatarUrl guardado en User es esta ruta exacta — sirve para reconocer "es un avatar de catalogo" al leer de vuelta. */
export function mascotIdFromAssetPath(avatarUrl: string | null): AvatarMascotId | null {
  if (!avatarUrl) return null;
  const match = AVATAR_MASCOT_IDS.find((id) => avatarUrl === mascotAssetPath(id));
  return match ?? null;
}

/** Asignacion automatica al registrarse (product-rules.md "Perfil y avatares"), sin paso obligatorio para el usuario. */
export function randomCatalogAvatar(): { mascotId: AvatarMascotId; background: AvatarBackground } {
  const mascotId = AVATAR_MASCOT_IDS[Math.floor(Math.random() * AVATAR_MASCOT_IDS.length)];
  const background = AVATAR_BACKGROUNDS[Math.floor(Math.random() * AVATAR_BACKGROUNDS.length)];
  return { mascotId, background };
}
