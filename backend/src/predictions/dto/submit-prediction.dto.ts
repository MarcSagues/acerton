import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';
import { DoubleChanceOption, PredictionChoice } from '@prisma/client';

export class SubmitPredictionDto {
  @IsString()
  matchId!: string;

  /** Requerido salvo que se use el comodin de remontada (que trae su propia combinacion). */
  @ValidateIf((dto: SubmitPredictionDto) => !dto.doubleChanceOption)
  @IsEnum(PredictionChoice)
  choice?: PredictionChoice;

  /** Comodin de remontada: sustituye a `choice` por una combinacion de 2 resultados. */
  @IsOptional()
  @IsEnum(DoubleChanceOption)
  doubleChanceOption?: DoubleChanceOption;
}
