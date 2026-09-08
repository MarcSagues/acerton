import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { DoubleChanceOption, PredictionChoice } from '@prisma/client';

export class SubmitPredictionDto {
  @IsString()
  matchId!: string;

  /** Grupos 1X2: requerido salvo que se use el comodin de remontada. Grupos EXACT_SCORE: no se admite. */
  @IsOptional()
  @IsEnum(PredictionChoice)
  choice?: PredictionChoice;

  /** Comodin de remontada: sustituye a `choice` por una combinacion de 2 resultados. Solo en grupos 1X2. */
  @IsOptional()
  @IsEnum(DoubleChanceOption)
  doubleChanceOption?: DoubleChanceOption;

  /** Grupos EXACT_SCORE: goles del equipo local predichos. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  predictedHomeScore?: number;

  /** Grupos EXACT_SCORE: goles del equipo visitante predichos. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  predictedAwayScore?: number;
}
