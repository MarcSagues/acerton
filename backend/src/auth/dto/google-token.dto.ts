import { IsOptional, IsString, Length, MinLength } from 'class-validator';

export class GoogleTokenDto {
  @IsString()
  @MinLength(20)
  idToken!: string;

  /** Codigo de referido capturado del link de invitacion (opcional, solo aplica si la cuenta es nueva) — ver ReferralsService.redeemBestEffort. */
  @IsOptional()
  @IsString()
  @Length(4, 16)
  referralCode?: string;
}
