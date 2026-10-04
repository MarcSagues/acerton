import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class UpdateGroupRulesDto {
  /**
   * Renombrar el grupo: mismos limites que al crearlo (CreateGroupDto). Se
   * recorta antes de validar para que "  ab  " no cuele como 4 caracteres ni
   * se guarde con espacios a los lados.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsBoolean()
  comebackEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  comebackPointsPerBonus?: number;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
