export interface JwtAccessPayload {
  sub: string;
  email: string;
  name: string;
}

export interface JwtRefreshPayload {
  sub: string;
  tokenId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  avatarBackground: string | null;
  usernameConfirmed: boolean;
  /** Fecha (ISO) a partir de la cual se puede volver a cambiar el nombre, o null si ya se puede ahora. */
  nameChangeAvailableAt: string | null;
  /** true tras terminar u omitir el tutorial por primera vez (por cuenta, no por dispositivo ni por grupo). */
  tutorialCompleted: boolean;
}
