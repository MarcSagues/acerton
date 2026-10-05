import { shortTeamName } from './team-name';

const match = {
  homeTeam: 'FC Barcelona',
  awayTeam: 'Club Atlético de Madrid',
  homeTeamShort: 'Barça',
  awayTeamShort: 'Atleti',
};

describe('shortTeamName', () => {
  it('usa el nombre corto del proveedor', () => {
    expect(shortTeamName(match, 'home')).toBe('Barça');
    expect(shortTeamName(match, 'away')).toBe('Atleti');
  });

  it('sin nombre corto (null, ausente o vacío) usa el completo', () => {
    expect(shortTeamName({ ...match, homeTeamShort: null }, 'home')).toBe('FC Barcelona');
    expect(shortTeamName({ ...match, awayTeamShort: undefined }, 'away')).toBe('Club Atlético de Madrid');
    expect(shortTeamName({ ...match, homeTeamShort: '  ' }, 'home')).toBe('FC Barcelona');
  });
});
