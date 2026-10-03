import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PublicUser } from '../auth/auth.types';
import { NAME_CHANGE_COOLDOWN_MS, toPublicUser } from '../auth/public-user.util';
import {
  AvatarBackground,
  AvatarMascotId,
  DEFAULT_MASCOT_IDS,
  mascotAssetPath,
} from './avatar-catalog';
import { levelRequiredForBackground, levelRequiredForMascot } from './avatar-level-rewards';
import { xpProgressForLevel } from '../xp/xp.util';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublicById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return toPublicUser(user);
  }

  /**
   * Cambia el nombre mostrado (usado tanto por el onboarding inicial de
   * cuentas de Google como por el ajuste en Perfil). Limitado a una vez cada
   * NAME_CHANGE_COOLDOWN_MS para que no se use para trolear las
   * clasificaciones del grupo cambiandolo constantemente; `nameChangedAt`
   * null (nunca se ha cambiado, sea cuenta nueva o antigua) siempre se
   * permite sin esperar.
   */
  async updateName(userId: string, name: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.nameChangedAt) {
      const availableAt = user.nameChangedAt.getTime() + NAME_CHANGE_COOLDOWN_MS;
      if (availableAt > Date.now()) {
        throw new ForbiddenException(
          `Solo puedes cambiar el nombre una vez por semana. Podras hacerlo de nuevo el ${new Date(
            availableAt,
          ).toLocaleDateString('es-ES')}.`,
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: name.trim(), usernameConfirmed: true, nameChangedAt: new Date() },
    });
    return toPublicUser(updated);
  }

  /**
   * Elige un avatar del catalogo de mascota con un color de fondo de la
   * paleta cerrada (ver avatar-catalog.ts). Los colores/mascotas "de
   * premio" del pase de nivel (Sprint 14) exigen haber llegado a ese
   * nivel — a diferencia de las mascotas de trofeo (todavia sin
   * comprobacion real en servidor, ver avatar-catalog.ts), el nivel ya es
   * un dato real por usuario (`User.experience`), asi que aqui si se
   * valida en servidor y no solo en el frontend.
   */
  async updateAvatar(
    userId: string,
    mascotId: AvatarMascotId,
    background: AvatarBackground,
  ): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const level = xpProgressForLevel(user.experience).level;

    if ((DEFAULT_MASCOT_IDS as readonly string[]).includes(mascotId)) {
      const requiredLevel = levelRequiredForMascot(mascotId);
      if (level < requiredLevel) {
        throw new ForbiddenException(`Necesitas el nivel ${requiredLevel} para usar esta mascota.`);
      }
    }
    const requiredBackgroundLevel = levelRequiredForBackground(background);
    if (level < requiredBackgroundLevel) {
      throw new ForbiddenException(
        `Necesitas el nivel ${requiredBackgroundLevel} para usar este color.`,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: mascotAssetPath(mascotId), avatarBackground: background },
    });
    return toPublicUser(updated);
  }

  /**
   * Marca el tutorial como visto (terminado u omitido) por primera vez.
   * Idempotente: repetirlo no adelanta ni cambia la fecha ya guardada, para
   * que "repetir el tutorial" desde Perfil no reinicie nada por si solo.
   */
  async completeTutorial(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.tutorialCompletedAt) {
      return toPublicUser(user);
    }
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { tutorialCompletedAt: new Date() },
    });
    return toPublicUser(updated);
  }

  async registerNotificationToken(userId: string, token: string): Promise<void> {
    await this.prisma.notificationToken.upsert({
      where: { token },
      update: { userId },
      create: { userId, token },
    });
  }

  async removeNotificationToken(userId: string, token: string): Promise<void> {
    await this.prisma.notificationToken.deleteMany({ where: { userId, token } });
  }
}
