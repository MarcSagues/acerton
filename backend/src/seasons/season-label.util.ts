/**
 * Etiqueta "2026/27" para mostrar, basada en la fecha real (corte
 * convencional a 1 de julio, como el calendario futbolistico habitual).
 * Solo es para presentacion: el cierre real de una GroupSeason no depende
 * de esto, depende de que se cuente el ultimo partido — ver SeasonsService.
 */
export function computeSeasonLabel(date: Date): string {
  const month = date.getUTCMonth() + 1; // 1-12
  const year = date.getUTCFullYear();
  const startYear = month >= 7 ? year : year - 1;
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, '0')}`;
}
