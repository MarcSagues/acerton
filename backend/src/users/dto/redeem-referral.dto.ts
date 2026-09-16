import { IsString, Length } from 'class-validator';

export class RedeemReferralDto {
  @IsString()
  @Length(4, 16)
  code!: string;
}
