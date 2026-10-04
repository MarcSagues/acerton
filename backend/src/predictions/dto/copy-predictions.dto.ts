import { IsString } from 'class-validator';

export class CopyPredictionsDto {
  /** Jornada cuyos pronosticos se copian del grupo de origen al grupo de la URL. */
  @IsString()
  matchdayId!: string;
}
