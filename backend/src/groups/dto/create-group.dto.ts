import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ScoringMode } from '@prisma/client';

export class CreateGroupDto {
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  comebackEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  comebackPointsPerBonus?: number;

  /** Fijado al crear el grupo; no se puede cambiar despues. Por defecto ONE_X_TWO. */
  @IsOptional()
  @IsEnum(ScoringMode)
  scoringMode?: ScoringMode;
}
