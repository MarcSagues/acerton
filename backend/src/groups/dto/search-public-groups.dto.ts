import { Transform, Type } from 'class-transformer';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ScoringMode } from '@prisma/client';

export class SearchPublicGroupsDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  q?: string;

  @IsOptional()
  @IsEnum(ScoringMode)
  scoringMode?: ScoringMode;

  /** Un grupo solo aparece si cumple TODAS las ligas seleccionadas (ver GroupsService.searchPublicGroups). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').filter(Boolean) : value))
  competitionIds?: string[];

  /** Id del ultimo grupo de la pagina anterior (paginacion por cursor, no por offset). */
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
