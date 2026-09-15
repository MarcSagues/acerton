import { Injectable } from '@nestjs/common';
import { NotificationPreference } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

export type NotificationPreferenceFields = Omit<
  NotificationPreference,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
>;

/** Mismos valores que los `@default` del modelo — usados cuando el usuario todavia no tiene fila propia. */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceFields = {
  matchdayOpening: true,
  reminder24h: false,
  reminder5h: false,
  reminder1h: true,
  reminder30m: false,
  matchFinishedPoints: false,
  matchdayFinishedResult: true,
  badgeEarned: true,
  seasonFinishedTrophies: true,
  reengagement: true,
  levelUp: true,
};

/**
 * Preferencias de aviso por cuenta (product-rules.md "Notificaciones"),
 * distintas del permiso de notificaciones del dispositivo. Fila creada de
 * forma perezosa: leerla para un usuario sin fila propia devuelve los
 * valores por defecto sin escribir nada (igual que StreaksService.
 * getGlobalForUser); solo se crea la fila real al guardar un cambio o al
 * necesitar comprobarla para decidir un envio real (ver NotificationsService).
 */
@Injectable()
export class NotificationPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string): Promise<NotificationPreferenceFields> {
    const preference = await this.prisma.notificationPreference.findUnique({ where: { userId } });
    return preference ?? DEFAULT_NOTIFICATION_PREFERENCES;
  }

  async updateForUser(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferenceFields> {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...DEFAULT_NOTIFICATION_PREFERENCES, ...dto },
    });
  }

  /** Lista de grupos del usuario con si tiene silenciados los avisos de cada uno. */
  async getMutedGroups(userId: string): Promise<{ groupId: string; name: string; muted: boolean }[]> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId },
      select: { mutedNotifications: true, group: { select: { id: true, name: true } } },
      orderBy: { group: { name: 'asc' } },
    });
    return memberships.map((m) => ({ groupId: m.group.id, name: m.group.name, muted: m.mutedNotifications }));
  }
}
