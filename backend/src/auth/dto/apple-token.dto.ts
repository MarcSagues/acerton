import { IsOptional, IsString, Length, MinLength } from 'class-validator';

/**
 * fullName solo llega en la PRIMERA autorizacion (ver
 * AuthService.loginWithAppleIdToken) — Apple no lo incluye en el identity
 * token, solo en la respuesta nativa de ASAuthorizationAppleIDCredential, y
 * unicamente la primera vez que el usuario autoriza esta app.
 */
export class AppleTokenDto {
  @IsString()
  @MinLength(20)
  identityToken!: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  /** Codigo de referido capturado del link de invitacion (opcional, solo aplica si la cuenta es nueva) — ver ReferralsService.redeemBestEffort. */
  @IsOptional()
  @IsString()
  @Length(4, 16)
  referralCode?: string;
}
