import { IsBoolean } from 'class-validator';

export class SetGroupFavoriteDto {
  @IsBoolean()
  favorite!: boolean;
}
