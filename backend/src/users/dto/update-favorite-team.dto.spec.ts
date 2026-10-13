import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UpdateFavoriteTeamDto } from './update-favorite-team.dto';

async function errorsFor(payload: unknown) {
  return validate(plainToInstance(UpdateFavoriteTeamDto, payload));
}

describe('UpdateFavoriteTeamDto', () => {
  it('acepta un equipo del catalogo', async () => {
    expect(await errorsFor({ team: 'FC Barcelona' })).toHaveLength(0);
  });

  it('acepta null para quitar el favorito', async () => {
    expect(await errorsFor({ team: null })).toHaveLength(0);
  });

  it('rechaza un nombre que no esta en el catalogo', async () => {
    expect(await errorsFor({ team: 'Mi equipo inventado' })).toHaveLength(1);
  });

  it('rechaza que falte el campo', async () => {
    expect(await errorsFor({})).toHaveLength(1);
  });
});
