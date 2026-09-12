/**
 * Catalogo cerrado de avatares "de fabrica" (product-rules.md § "Perfil y
 * avatares": catalogo de avatares predeterminados). Cada id corresponde
 * 1:1 a un PNG en frontend/public/assets/avatars/mascot/<id>.png (fondo
 * transparente, 512x512, personaje centrado) — si se anade o quita un
 * fichero ahi, hay que reflejarlo aqui tambien.
 *
 * Restringido a un catalogo cerrado (en vez de aceptar cualquier URL/color)
 * porque todavia no existe subida de foto propia (requiere decidir
 * almacenamiento de imagenes, ver docs/quiniela/backlog.md) — esto evita
 * aceptar URLs o colores arbitrarios en el DTO mientras tanto.
 */
export const DEFAULT_MASCOT_IDS = [
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

/**
 * Mascotas con trofeo, solo elegibles si el usuario tiene esa copa (ver
 * AVATAR_TROPHY_REQUIREMENT). El id de trofeo coincide con el `id` del
 * catalogo de trofeos del frontend (features/profile/domain/trophies.ts)
 * para poder cruzar ambos sin traducir nombres.
 *
 * IMPORTANTE — limite conocido: los trofeos todavia no son un concepto
 * real en este backend (Sprint 6 del roadmap sigue bloqueado, sin modelo
 * de datos — ver docs/quiniela/roadmap.md). Por eso esta comprobacion de
 * "tienes esa copa" solo existe hoy en el frontend, contra el mismo
 * catalogo de muestra que ya se usa para previsualizar la Vitrina de
 * Perfil (recuento fijo, igual para todos los usuarios). Este endpoint
 * acepta cualquier mascota de trofeo sin comprobar nada por su cuenta —
 * no hay todavia una fuente de verdad en servidor con la que hacerlo. En
 * cuanto exista un modelo real de trofeos, esta validacion debe moverse
 * aqui (UpdateAvatarDto/UsersService) para que dejar de tener la copa
 * tambien pueda revocar el avatar, no solo impedir elegirlo.
 */
export const TROPHY_MASCOT_IDS = [
  'trophy-champions',
  'trophy-laliga',
  'trophy-bundesliga',
  'trophy-ligue1',
  'trophy-europa',
  'trophy-seriea',
  'trophy-piqo',
] as const;

export const AVATAR_MASCOT_IDS = [...DEFAULT_MASCOT_IDS, ...TROPHY_MASCOT_IDS] as const;

export type AvatarMascotId = (typeof AVATAR_MASCOT_IDS)[number];

/** Id del trofeo (ver domain/trophies.ts en frontend) que hace falta tener para poder elegir esta mascota. */
export const AVATAR_TROPHY_REQUIREMENT: Record<(typeof TROPHY_MASCOT_IDS)[number], string> = {
  'trophy-champions': 'champions',
  'trophy-laliga': 'laliga',
  'trophy-bundesliga': 'bundesliga',
  'trophy-ligue1': 'ligue1',
  'trophy-europa': 'europa',
  'trophy-seriea': 'seriea',
  'trophy-piqo': 'piqo',
};

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

/**
 * Asignacion automatica al registrarse (product-rules.md "Perfil y
 * avatares"), sin paso obligatorio para el usuario. Solo entre las
 * mascotas por defecto: una cuenta recien creada no ha ganado ningun
 * trofeo todavia, asi que nunca le toca en suerte una mascota de trofeo.
 */
export function randomCatalogAvatar(): { mascotId: AvatarMascotId; background: AvatarBackground } {
  const mascotId = DEFAULT_MASCOT_IDS[Math.floor(Math.random() * DEFAULT_MASCOT_IDS.length)];
  const background = AVATAR_BACKGROUNDS[Math.floor(Math.random() * AVATAR_BACKGROUNDS.length)];
  return { mascotId, background };
}
