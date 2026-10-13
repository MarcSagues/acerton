import { teamColors, teamDiscBackground } from './team-colors';

describe('team-colors', () => {
  it('devuelve los dos colores del club por su nombre completo', () => {
    expect(teamColors('FC Barcelona')).not.toBeNull();
    expect(teamColors('  Borussia Dortmund ')).toEqual({ primary: '#1a1a1a', secondary: '#fdd835' });
  });

  it('devuelve null si no conocemos el equipo', () => {
    expect(teamColors('Equipo Inventado FC')).toBeNull();
  });

  it('parte el disco en diagonal con los dos colores', () => {
    expect(teamDiscBackground({ primary: '#111111', secondary: '#eeeeee' })).toBe(
      'linear-gradient(135deg, #111111 50%, #eeeeee 50%)',
    );
  });
});
