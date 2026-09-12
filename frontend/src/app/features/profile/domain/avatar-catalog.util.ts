/** Extrae el id de mascota de una URL de avatar de catalogo, o null si no lo es (foto propia u otra cosa). */
export function mascotIdFromUrl(avatarUrl: string | null): string | null {
  if (!avatarUrl) return null;
  const match = avatarUrl.match(/\/assets\/avatars\/mascot\/([a-z0-9-]+)\.png$/);
  return match ? match[1] : null;
}
