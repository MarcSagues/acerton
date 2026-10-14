/**
 * Insignias distintas conseguidas. Una misma insignia se concede por grupo (una
 * fila por usuario, insignia y grupo), así que `badges.length` cuenta de más a
 * quien la tiene en varios grupos: 5 insignias en 3 grupos son hasta 13 filas.
 */
export function distinctBadgeCount(badges: ReadonlyArray<{ badge: { code: string } }>): number {
  return new Set(badges.map((entry) => entry.badge.code)).size;
}
