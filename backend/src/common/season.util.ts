/**
 * Convencion de temporada europea: la temporada 2025 (2025/2026) va de
 * agosto de 2025 a mayo/junio de 2026. Se usa para acotar el limite de
 * comodines por temporada independientemente de a que competicion
 * pertenezca el partido.
 */
export function getFootballSeasonForDate(date: Date): number {
  const month = date.getUTCMonth(); // 0 = enero
  const year = date.getUTCFullYear();
  return month >= 6 ? year : year - 1;
}

export function getCurrentFootballSeason(): number {
  return getFootballSeasonForDate(new Date());
}
