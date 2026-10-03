import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { XpService } from '../xp/xp.service';
import { generateShortCode } from '../common/short-code.util';

/**
 * Sistema de referidos (Sprint 14, roadmap) — planteado el 2026-09-16 a
 * peticion explicita del usuario. Un unico codigo por cuenta sirve tanto
 * para compartir como link (?ref=CODIGO) como para teclearlo a mano en
 * Ajustes; los dos caminos llaman a `redeem` y producen el mismo resultado.
 * `User.referredById` guarda la relacion de forma permanente (se fija una
 * sola vez) para que Sprint 11 (Premium) pueda aplicar descuentos segun el
 * referidor sin rediseñar este modelo.
 */
@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
  ) {}

  async generateUniqueReferralCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateShortCode();
      const existing = await this.prisma.user.findUnique({ where: { referralCode: code } });
      if (!existing) {
        return code;
      }
    }
    throw new Error('No se pudo generar un codigo de referido unico');
  }

  async getMyReferral(userId: string): Promise<{ code: string; referralCount: number }> {
    const [user, referralCount] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { referralCode: true } }),
      this.prisma.user.count({ where: { referredById: userId } }),
    ]);
    return { code: user.referralCode, referralCount };
  }

  /**
   * Enlaza `userId` con el dueño de `code` como su referidor. Usado tanto
   * al registrarse (AuthService, con el codigo capturado del link/query
   * param) como al teclearlo a mano desde Ajustes — mismo resultado por
   * ambos caminos. No falla de forma bloqueante para el llamador de
   * registro: ver `redeemBestEffort`.
   */
  async redeem(userId: string, code: string): Promise<{ referrerName: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { referredById: true },
    });
    if (user.referredById) {
      throw new ConflictException('Tu cuenta ya tiene un referidor asignado');
    }

    const referrer = await this.prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
      select: { id: true, name: true },
    });
    if (!referrer) {
      throw new NotFoundException('Código de invitación no válido');
    }
    if (referrer.id === userId) {
      throw new BadRequestException('No puedes usar tu propio código');
    }

    await this.prisma.user.update({ where: { id: userId }, data: { referredById: referrer.id } });

    // El indice (1 = primer referido) se lee tras guardar la relacion, para
    // que cuente la que se acaba de crear. La caida de XP (ver xpForReferral)
    // es lo unico que puede fallar sin deshacer el vinculo ya guardado, que
    // es el dato que de verdad importa conservar (Sprint 11).
    const referralIndex = await this.prisma.user.count({ where: { referredById: referrer.id } });
    await this.xpService.awardReferral(referrer.id, referralIndex).catch(() => undefined);

    return { referrerName: referrer.name };
  }

  /**
   * Igual que `redeem`, pero pensado para engancharse al registro (email o
   * Google): un codigo invalido o ya usado no debe impedir crear la cuenta,
   * igual que un fallo al enviar el correo de verificacion no revierte el
   * alta (ver AuthService.register).
   */
  async redeemBestEffort(userId: string, code: string | undefined): Promise<void> {
    if (!code) {
      return;
    }
    await this.redeem(userId, code).catch(() => undefined);
  }
}
