import { TrophyDetailData } from '../trophy-detail-dialog.component';

/**
 * Vitrina de trofeos (HANDOFF §13/§18): 7 disenos fijos del kit. Piqo aun no
 * tiene un modelo de datos real para trofeos ("Para Copa Piqo falta fijar el
 * criterio"), asi que se muestran todos honestamente como no conseguidos en
 * vez de inventar datos de competiciones ganadas — salvo los dos rellenados
 * a mano con `years` para previsualizar el diseno de la vitrina y del
 * resumen de temporada (ver TrophySeasonComponent, que deja claro que su
 * contenido tambien es de muestra).
 */
export const TROPHIES: TrophyDetailData[] = [
  { id: 'piqo', name: 'Copa Piqo', count: 1, years: [2026] },
  { id: 'champions', name: 'Champions League', count: 3, years: [2026, 2025, 2024] },
  { id: 'laliga', name: 'LaLiga', count: 0 },
  { id: 'bundesliga', name: 'Bundesliga', count: 0 },
  { id: 'ligue1', name: 'Ligue 1', count: 0 },
  { id: 'europa', name: 'Europa League', count: 0 },
  { id: 'seriea', name: 'Serie A', count: 0 },
];

export function trophyById(id: string): TrophyDetailData | null {
  return TROPHIES.find((trophy) => trophy.id === id) ?? null;
}
