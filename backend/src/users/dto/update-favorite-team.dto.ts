import { IsIn, ValidateIf } from 'class-validator';
import { FAVORITE_TEAM_NAMES } from '../team-catalog';

export class UpdateFavoriteTeamDto {
  /** Nombre completo de un equipo del catalogo, o null para quitar el favorito. */
  @ValidateIf((_, value) => value !== null)
  @IsIn(FAVORITE_TEAM_NAMES)
  team!: string | null;
}
