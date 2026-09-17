import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthTokens, JwtAccessPayload, JwtRefreshPayload, PublicUser } from './auth.types';
import { hashToken } from './token-hash.util';
import { toPublicUser } from './public-user.util';
import { mascotAssetPath, defaultCatalogAvatar } from '../users/avatar-catalog';
import { ReferralsService } from '../users/referrals.service';

const SALT_ROUNDS = 12;
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000;
/** Mensaje generico e identico exista o no la cuenta, para no confirmar por temporizacion ni por contenido si un email esta registrado. */
export const GENERIC_EMAIL_ACTION_MESSAGE = {
  message: 'Si la cuenta existe, te hemos enviado un correo.',
};

export interface GoogleProfileInput {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  /** Codigo de referido capturado del link de invitacion — solo se aplica si la cuenta se crea de nuevo, ver validateOrCreateGoogleUser. */
  referralCode?: string;
}

@Injectable()
export class AuthService {
  private readonly googleOAuthClient: OAuth2Client;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly mailService: MailService,
    private readonly referralsService: ReferralsService,
  ) {
    this.googleOAuthClient = new OAuth2Client(
      this.configService.get('google.clientId', { infer: true }),
    );
  }

  /**
   * No inicia sesion: la cuenta se crea sin verificar y queda bloqueada
   * (ver login) hasta confirmar el correo. Un fallo al enviar el email no
   * revierte la creacion — el usuario puede pedir que se reenvie.
   */
  async register(dto: RegisterDto): Promise<{ email: string }> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Ya existe una cuenta con ese email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const { mascotId, background } = defaultCatalogAvatar();
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        avatarUrl: mascotAssetPath(mascotId),
        avatarBackground: background,
        referralCode: await this.referralsService.generateUniqueReferralCode(),
      },
    });

    await this.referralsService.redeemBestEffort(user.id, dto.referralCode);
    await this.sendVerificationEmail(user.id, user.email);
    return { email: user.email };
  }

  async login(dto: LoginDto): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
      );
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  /** Confirma la cuenta y, de paso, inicia sesion — evita pedir la contrasena otra vez justo despues de confirmar. */
  async verifyEmail(token: string): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.authToken.findFirst({
      where: {
        tokenHash,
        purpose: 'EMAIL_VERIFICATION',
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) {
      throw new BadRequestException('El enlace de confirmación no es válido o ha caducado');
    }

    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  /** No revela si la cuenta existe o ya esta verificada: siempre "hecho" desde fuera (ver AuthController). */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.emailVerifiedAt) {
      return;
    }
    await this.sendVerificationEmail(user.id, user.email);
  }

  /** No revela si la cuenta existe, si es solo-Google o si el envio fallo: siempre "hecho" desde fuera. */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return;
    }

    const token = randomBytes(32).toString('hex');
    await this.prisma.authToken.create({
      data: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
      },
    });

    const resetUrl = `${this.configService.get('corsOrigin', { infer: true })}/reset-password?token=${token}`;
    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
    } catch {
      // No se relanza: la respuesta al frontend es siempre generica (ver AuthController).
    }
  }

  /** Revoca todas las sesiones activas: tras un reset, cualquier dispositivo ya conectado tiene que volver a iniciar sesion. */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = hashToken(token);
    const record = await this.prisma.authToken.findFirst({
      where: { tokenHash, purpose: 'PASSWORD_RESET', usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!record) {
      throw new BadRequestException(
        'El enlace para restablecer la contraseña no es válido o ha caducado',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /** Cambio de contrasena estando ya conectado (Ajustes de Perfil), distinto del flujo de "olvide mi contrasena". */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    if (!user.passwordHash) {
      throw new BadRequestException(
        'Esta cuenta usa Google para iniciar sesión y no tiene contraseña que cambiar',
      );
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('hex');
    await this.prisma.authToken.create({
      data: {
        userId,
        purpose: 'EMAIL_VERIFICATION',
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
      },
    });

    const verifyUrl = `${this.configService.get('corsOrigin', { infer: true })}/verify-email?token=${token}`;
    try {
      await this.mailService.sendVerificationEmail(email, verifyUrl);
    } catch {
      // No se bloquea el registro por un fallo de envio: el usuario puede pedir "reenviar".
    }
  }

  async validateOrCreateGoogleUser(
    profile: GoogleProfileInput,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    let isNewUser = false;

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId: profile.googleId,
            // Enlazar con Google prueba que el email es suyo, aunque la
            // cuenta se creara antes por email/contrasena sin confirmar.
            emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          },
        });
      } else {
        isNewUser = true;
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name,
            googleId: profile.googleId,
            avatarUrl: profile.avatarUrl,
            // El nombre viene del perfil de Google, no lo eligio el usuario:
            // se le pide confirmarlo/cambiarlo en el onboarding.
            usernameConfirmed: false,
            // Google ya verifico este email: no hace falta el paso de confirmacion.
            emailVerifiedAt: new Date(),
            referralCode: await this.referralsService.generateUniqueReferralCode(),
          },
        });
      }
    }

    // Solo se enlaza un referidor si la cuenta se acaba de crear — enlazar
    // Google a una cuenta ya existente no es un "nuevo referido".
    if (isNewUser) {
      await this.referralsService.redeemBestEffort(user.id, profile.referralCode);
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  /**
   * Login con Google desde la app nativa (Capacitor): a diferencia del flujo
   * web (redireccion via passport-google-oauth20), aqui el SDK nativo de
   * Google Sign-In ya entrega un idToken firmado directamente en el
   * dispositivo. Se verifica su firma y audiencia contra el client id que el
   * frontend le pasa a `GoogleSignIn.initialize({ clientId })`
   * (`environment.googleWebClientId` — hoy igual en todos los `environment.*.ts`,
   * asi que es el mismo pase lo que pase con la API a la que apunte el build;
   * OJO: no es el `GIDClientID` de Info.plist, que es un id de app iOS
   * distinto usado solo para el flujo nativo con Google, no para la
   * audiencia del idToken) ademas del propio de este backend
   * (`google.nativeClientId`), antes de confiar en ningun dato del payload —
   * asi un backend de pre/dev con un client id "web" distinto tambien puede
   * verificar tokens nativos.
   */
  async loginWithGoogleIdToken(
    idToken: string,
    referralCode?: string,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const clientId = this.configService.get('google.clientId', { infer: true });
    const nativeClientId = this.configService.get('google.nativeClientId', { infer: true });
    const audience = [...new Set([clientId, nativeClientId].filter((id): id is string => !!id))];
    let payload;
    try {
      const ticket = await this.googleOAuthClient.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Token de Google inválido');
    }

    if (!payload?.email || !payload.sub) {
      throw new UnauthorizedException('El token de Google no incluye un email');
    }

    return this.validateOrCreateGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name ?? payload.email,
      avatarUrl: payload.picture,
      referralCode,
    });
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: this.configService.get('jwt.refreshSecret', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }

    const stored = await this.prisma.refreshToken.findUnique({ where: { id: payload.tokenId } });
    const tokenHash = hashToken(refreshToken);

    if (
      !stored ||
      stored.revokedAt ||
      stored.tokenHash !== tokenHash ||
      stored.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
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
    // Unico punto de paso de login/verify-email/Google/refresh: marca
    // "actividad" en cualquier apertura de la app, para el aviso de
    // reenganche tras dias sin entrar (ver JobsService.sendReengagementNotifications).
    void this.prisma.user
      .update({ where: { id: userId }, data: { lastActiveAt: new Date() } })
      .catch(() => undefined);

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
    throw new Error(`Formato de duración inválido: ${duration}`);
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
