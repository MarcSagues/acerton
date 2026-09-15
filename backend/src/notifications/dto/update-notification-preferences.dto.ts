import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  matchdayOpening?: boolean;

  @IsOptional()
  @IsBoolean()
  reminder24h?: boolean;

  @IsOptional()
  @IsBoolean()
  reminder5h?: boolean;

  @IsOptional()
  @IsBoolean()
  reminder1h?: boolean;

  @IsOptional()
  @IsBoolean()
  reminder30m?: boolean;

  @IsOptional()
  @IsBoolean()
  matchFinishedPoints?: boolean;

  @IsOptional()
  @IsBoolean()
  matchdayFinishedResult?: boolean;

  @IsOptional()
  @IsBoolean()
  badgeEarned?: boolean;

  @IsOptional()
  @IsBoolean()
  seasonFinishedTrophies?: boolean;

  @IsOptional()
  @IsBoolean()
  reengagement?: boolean;
}
