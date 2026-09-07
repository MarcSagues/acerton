import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateGroupRulesDto {
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
