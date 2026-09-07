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
}
