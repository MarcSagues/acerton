import { FavoriteTeam } from '../../../core/models/favorite-team.model';
import { filterTeams } from './favorite-team.util';

const team = (name: string): FavoriteTeam => ({ name, primary: '#000000', secondary: '#ffffff' });
const TEAMS = [team('Club Atlético de Madrid'), team('FC Barcelona'), team('Real Madrid CF')];

describe('filterTeams', () => {
  it('sin texto devuelve todos', () => {
    expect(filterTeams(TEAMS, '  ')).toEqual(TEAMS);
  });

  it('no distingue mayusculas ni tildes', () => {
    expect(filterTeams(TEAMS, 'ATLETICO').map((t) => t.name)).toEqual(['Club Atlético de Madrid']);
  });

  it('encuentra por cualquier parte del nombre', () => {
    expect(filterTeams(TEAMS, 'madrid').map((t) => t.name)).toEqual(['Club Atlético de Madrid', 'Real Madrid CF']);
  });

  it('sin coincidencias devuelve una lista vacia', () => {
    expect(filterTeams(TEAMS, 'zzz')).toEqual([]);
  });
});
