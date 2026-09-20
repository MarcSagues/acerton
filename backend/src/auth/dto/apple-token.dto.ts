import { IsOptional, IsString, MinLength } from 'class-validator';

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
}
