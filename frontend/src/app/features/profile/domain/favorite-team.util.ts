import { FavoriteTeam } from '../../../core/models/favorite-team.model';

/** Minusculas y sin tildes, para que "atletico" encuentre "Club Atlético de Madrid". */
function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Equipos cuyo nombre contiene lo escrito (sin distinguir mayusculas ni tildes); vacio = todos. */
export function filterTeams(teams: readonly FavoriteTeam[], search: string): FavoriteTeam[] {
  const needle = normalize(search);
  if (!needle) return [...teams];
  return teams.filter((team) => normalize(team.name).includes(needle));
}
