import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokens, JwtAccessPayload, JwtRefreshPayload, PublicUser } from './auth.types';
import { hashToken } from './token-hash.util';
import { toPublicUser } from './public-user.util';

const SALT_ROUNDS = 12;

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { email: dto.email, passwordHash, name: dto.name },
    });

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  async validateOrCreateGoogleUser(
    profile: GoogleProfileInput,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      user = existingByEmail
        ? await this.prisma.user.update({
            where: { id: existingByEmail.id },
            data: { googleId: profile.googleId },
          })
        : await this.prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name,
              googleId: profile.googleId,
              avatarUrl: profile.avatarUrl,
              // El nombre viene del perfil de Google, no lo eligio el usuario:
              // se le pide confirmarlo/cambiarlo en el onboarding.
              usernameConfirmed: false,
            },
          });
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token invalido');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    const tokenHash = hashToken(refreshToken);

    if (
      !stored ||
      stored.revokedAt ||
      stored.tokenHash !== tokenHash ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token invalido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // Rotacion: se revoca el token usado y se emite uno nuevo.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(user.id, user.email, user.name);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
      });
      await this.prisma.refreshToken.updateMany({
        where: { id: payload.tokenId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // token ya invalido/expirado: no hay nada que revocar
    }
  }

  private async issueTokens(userId: string, email: string, name: string): Promise<AuthTokens> {
    const accessPayload: JwtAccessPayload = { sub: userId, email, name };
    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: this.configService.get('jwt.accessSecret', { infer: true }),
      expiresIn: this.configService.get('jwt.accessExpiresIn', { infer: true }),
    });

    const refreshExpiresIn = this.configService.get('jwt.refreshExpiresIn', { infer: true });
    const expiresAt = addDuration(new Date(), refreshExpiresIn);

    const refreshTokenRow = await this.prisma.refreshToken.create({
      data: { userId, tokenHash: '', expiresAt },
    });

    const refreshPayload: JwtRefreshPayload = { sub: userId, tokenId: refreshTokenRow.id };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.configService.get('jwt.refreshSecret', { infer: true }),
      expiresIn: refreshExpiresIn,
    });

    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRow.id },
      data: { tokenHash: hashToken(refreshToken) },
    });

    return { accessToken, refreshToken };
  }
}

/** Parsea sufijos tipo "30d", "15m", "1h" (formato que acepta @nestjs/jwt/ms). */
function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)(ms|s|m|h|d|w|y)$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Formato de duracion invalido: ${duration}`);
  }
  const value = parseInt(match[1], 10);
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
    w: 604_800_000,
    y: 31_536_000_000,
  };
  return new Date(base.getTime() + value * unitMs[match[2]]);
}
