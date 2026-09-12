import { TrophyDetailData } from '../trophy-detail-dialog.component';

/**
 * Vitrina de trofeos (HANDOFF §13/§18): 7 disenos fijos del kit. Piqo aun no
 * tiene un modelo de datos real para trofeos ("Para Copa Piqo falta fijar el
 * criterio"), asi que se muestran todos honestamente como no conseguidos en
 * vez de inventar datos de competiciones ganadas.
 *
 * IMPORTANTE: esta constante es global — no hay todavia forma de calcular
 * un `count` real por usuario, asi que cualquier valor > 0 aqui lo veria
 * TODO el mundo (incluida una cuenta recien registrada), no solo quien
 * "deberia" tenerlo. Ya se puso a 1/3 una vez para previsualizar el diseno
 * de la vitrina a peticion explicita del usuario, y volvio a dejarse en 0
 * al detectar que las cuentas nuevas aparecian con trofeos — no reactivar
 * sin dejar claro (y limitar en el tiempo) que es una previsualizacion, y
 * revertirlo en la misma sesion.
 */
export const TROPHIES: TrophyDetailData[] = [
  { id: 'piqo', name: 'Copa Piqo', count: 0 },
  { id: 'champions', name: 'Champions League', count: 0 },
  { id: 'laliga', name: 'LaLiga', count: 0 },
  { id: 'bundesliga', name: 'Bundesliga', count: 0 },
  { id: 'ligue1', name: 'Ligue 1', count: 0 },
  { id: 'europa', name: 'Europa League', count: 0 },
  { id: 'seriea', name: 'Serie A', count: 0 },
];

export function trophyById(id: string): TrophyDetailData | null {
  return TROPHIES.find((trophy) => trophy.id === id) ?? null;
}
