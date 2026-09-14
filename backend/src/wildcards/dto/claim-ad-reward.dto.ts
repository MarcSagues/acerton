import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimAdRewardDto {
  @IsString()
  @IsNotEmpty()
  matchdayId!: string;
}
