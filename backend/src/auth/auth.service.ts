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
import appleSignin from 'apple-signin-auth';
import { GroupRole } from '@prisma/client';
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

export interface AppleProfileInput {
  appleSub: string;
  email: string;
  /** Solo presente si Apple lo compartio (primera autorizacion, ver AuthController.appleToken). */
  name?: string;
  /** Codigo de referido del link de invitacion (solo aplica si la cuenta es nueva). */
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

  /**
   * Borrado de cuenta autoservicio (Guideline 5.1.1(v) de App Store): borra
   * al usuario y todo lo que cuelga de el via onDelete: Cascade en el schema
   * (predicciones, membresias, insignias, rachas, tokens, avisos...). Si la
   * cuenta tiene contrasena, la exige para confirmar (mismo criterio que
   * changePassword) — evita un borrado accidental con solo un access token
   * robado; las cuentas solo-Google no tienen nada que comprobar aqui, la
   * confirmacion la hace el dialogo del frontend.
   *
   * Los grupos de los que es propietario no se pueden borrar en cascada sin
   * mas: `Group.ownerId` es ON DELETE RESTRICT a proposito (no se puede
   * dejar un grupo sin dueno) y borrarlo entero se llevaria por delante el
   * historial de sus otros miembros. Asi que primero se resuelve cada uno:
   * si tiene mas miembros, se transfiere la propiedad al mas antiguo (mismo
   * mecanismo que GroupsService.transferOwnership). Si esta solo, se borra
   * DEL TODO (no en logico como GroupsService.deleteGroup): `ownerId` no
   * admite null, asi que dejarlo en logico dejaria la fila del grupo
   * apuntando todavia al usuario que se esta borrando y el propio
   * `tx.user.delete` de mas abajo chocaria con esa misma restriccion
   * RESTRICT. Al no quedar mas miembros no hay historial de nadie mas que
   * preservar, asi que el borrado fisico es correcto aqui.
   */
  async deleteAccount(userId: string, password?: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (user.passwordHash) {
      if (!password) {
        throw new UnauthorizedException('Introduce tu contraseña para confirmar');
      }
      const matches = await bcrypt.compare(password, user.passwordHash);
      if (!matches) {
        throw new UnauthorizedException('La contraseña no es correcta');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const ownedGroups = await tx.group.findMany({
        where: { ownerId: userId, deletedAt: null },
        select: { id: true },
      });

      for (const { id: groupId } of ownedGroups) {
        const nextOwner = await tx.groupMembership.findFirst({
          where: { groupId, userId: { not: userId } },
          orderBy: { joinedAt: 'asc' },
        });

        if (nextOwner) {
          await tx.groupMembership.update({
            where: { id: nextOwner.id },
            data: { role: GroupRole.ADMIN },
          });
          await tx.group.update({ where: { id: groupId }, data: { ownerId: nextOwner.userId } });
        } else {
          await tx.group.delete({ where: { id: groupId } });
        }
      }

      await tx.user.delete({ where: { id: userId } });
    });
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

  async validateOrCreateAppleUser(
    profile: AppleProfileInput,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    let user = await this.prisma.user.findUnique({ where: { appleSub: profile.appleSub } });
    let isNewUser = false;

    if (!user) {
      const existingByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (existingByEmail) {
        user = await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            appleSub: profile.appleSub,
            // Enlazar con Apple prueba que el email es suyo, igual que con Google.
            emailVerifiedAt: existingByEmail.emailVerifiedAt ?? new Date(),
          },
        });
      } else {
        isNewUser = true;
        const { mascotId, background } = defaultCatalogAvatar();
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name ?? profile.email,
            appleSub: profile.appleSub,
            avatarUrl: mascotAssetPath(mascotId),
            avatarBackground: background,
            // Igual que Google: si Apple no compartio el nombre (lo mas
            // habitual salvo la primera autorizacion), se pide confirmarlo en
            // el onboarding antes de entrar a la app.
            usernameConfirmed: !!profile.name,
            // Apple ya verifico este email: no hace falta el paso de confirmacion.
            emailVerifiedAt: new Date(),
            referralCode: await this.referralsService.generateUniqueReferralCode(),
          },
        });
      }
    }

    // Igual que Google: solo una cuenta recien creada cuenta como referido.
    if (isNewUser) {
      await this.referralsService.redeemBestEffort(user.id, profile.referralCode);
    }

    const tokens = await this.issueTokens(user.id, user.email, user.name);
    return { user: toPublicUser(user), tokens };
  }

  /**
   * Login con Sign in with Apple desde la app nativa iOS (Capacitor):
   * ASAuthorizationAppleIDProvider entrega un identityToken (JWT) firmado por
   * Apple directamente en el dispositivo, igual de espiritu que el idToken de
   * Google Sign-In nativo. Se verifica su firma contra las claves publicas de
   * Apple (JWKS, via `apple-signin-auth`, que las cachea) y su audiencia
   * contra el bundle id de la app (`apple.bundleId` — a diferencia de Google,
   * NO hace falta un Services ID ni client secret: eso solo se necesita para
   * el flujo web con redireccion, que esta app no usa).
   *
   * `fullName` solo llega en la primera autorizacion (ver AppleTokenDto) — el
   * nombre no es un claim del identity token, Apple solo lo entrega una vez
   * en la respuesta nativa, asi que el frontend debe guardarlo y mandarlo esa
   * primera vez si quiere que la cuenta nazca con el nombre real en vez del
   * email.
   */
  async loginWithAppleIdToken(
    identityToken: string,
    fullName?: string,
    referralCode?: string,
  ): Promise<{ user: PublicUser; tokens: AuthTokens }> {
    const bundleId = this.configService.get('apple.bundleId', { infer: true });
    let payload;
    try {
      payload = await appleSignin.verifyIdToken(identityToken, {
        audience: bundleId,
        ignoreExpiration: false,
      });
    } catch {
      throw new UnauthorizedException('Token de Apple inválido');
    }

    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException('El token de Apple no incluye un email');
    }

    return this.validateOrCreateAppleUser({
      appleSub: payload.sub,
      email: payload.email,
      name: fullName,
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
