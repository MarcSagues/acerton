import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RankingPeriod } from '@prisma/client';

export class GetRankingQueryDto {
  @IsEnum(RankingPeriod)
  period!: RankingPeriod;

  /** id de competicion, o "general" para la clasificacion combinada del grupo */
  @IsString()
  scope!: string;

  @IsOptional()
  @IsString()
  matchdayId?: string;
}
