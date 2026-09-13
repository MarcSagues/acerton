import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { DEFAULT_NOTIFICATION_PREFERENCES, NotificationPreferenceFields } from './notification-preferences.service';

export interface PushNotification {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private messaging: admin.messaging.Messaging | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  onModuleInit(): void {
    const { projectId, clientEmail, privateKey } = this.configService.get('firebase', {
      infer: true,
    });
    if (!projectId || !clientEmail || !privateKey) {
      this.logger.warn('Firebase no configurado: las notificaciones push quedan deshabilitadas');
      return;
    }

    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
    this.messaging = admin.messaging(app);
  }

  async sendToUser(userId: string, notification: PushNotification): Promise<void> {
    const tokens = await this.prisma.notificationToken.findMany({ where: { userId } });
    await this.sendToTokens(
      tokens.map((t) => t.token),
      notification,
    );
  }

  async sendToUsers(userIds: string[], notification: PushNotification): Promise<void> {
    if (userIds.length === 0) return;
    const tokens = await this.prisma.notificationToken.findMany({
      where: { userId: { in: userIds } },
    });
    await this.sendToTokens(
      tokens.map((t) => t.token),
      notification,
    );
  }

  private async sendToTokens(tokens: string[], notification: PushNotification): Promise<void> {
    if (!this.messaging || tokens.length === 0) {
      return;
    }

    const response = await this.messaging.sendEachForMulticast({
      tokens,
      notification: { title: notification.title, body: notification.body },
      data: notification.data,
    });

    const invalidTokens = response.responses
      .map((res, index) => (res.success ? null : tokens[index]))
      .filter((token): token is string => token !== null);

    if (invalidTokens.length > 0) {
      await this.prisma.notificationToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  }

  /**
   * De una lista de candidatos a recibir un aviso de un grupo concreto,
   * descarta a quien tenga el grupo silenciado (GroupMembership.
   * mutedNotifications) o el tipo de aviso desactivado en sus preferencias
   * de cuenta (NotificationPreference, con los valores por defecto del
   * modelo para quien todavia no tiene fila propia).
   */
  private async filterByPreference(
    groupId: string,
    userIds: string[],
    field: keyof NotificationPreferenceFields,
  ): Promise<string[]> {
    if (userIds.length === 0) return [];

    const [memberships, preferences] = await Promise.all([
      this.prisma.groupMembership.findMany({
        where: { groupId, userId: { in: userIds } },
        select: { userId: true, mutedNotifications: true },
      }),
      this.prisma.notificationPreference.findMany({ where: { userId: { in: userIds } } }),
    ]);

    const mutedByUser = new Map(memberships.map((m) => [m.userId, m.mutedNotifications]));
    const preferenceByUser = new Map(preferences.map((p) => [p.userId, p]));

    return userIds.filter((userId) => {
      if (mutedByUser.get(userId)) return false;
      const preference = preferenceByUser.get(userId) ?? DEFAULT_NOTIFICATION_PREFERENCES;
      return preference[field];
    });
  }

  /**
   * Recordatorio de cierre a los miembros de un grupo que todavia no han
   * completado su quiniela de esta jornada (ni la han empezado, ni la han
   * enviado entera). `preferenceField` distingue la franja (24h/5h/1h/30min,
   * ver JobsService.REMINDER_TIERS): cada una es una preferencia
   * independiente, y `urgencyLabel` sube de tono el mensaje segun se acerca
   * el cierre.
   */
  async notifyMatchdayClosingSoon(
    groupId: string,
    matchdayId: string,
    matchdayName: string,
    urgencyLabel: string,
    preferenceField: keyof NotificationPreferenceFields,
  ): Promise<void> {
    const [members, totalMatches, predictionCounts] = await Promise.all([
      this.prisma.groupMembership.findMany({ where: { groupId }, select: { userId: true } }),
      this.prisma.match.count({ where: { matchdayId } }),
      this.prisma.prediction.groupBy({
        by: ['userId'],
        where: { groupId, match: { matchdayId } },
        _count: { _all: true },
      }),
    ]);

    const submittedCountByUser = new Map(predictionCounts.map((p) => [p.userId, p._count._all]));
    const pendingUserIds = members
      .map((m) => m.userId)
      .filter((userId) => (submittedCountByUser.get(userId) ?? 0) < totalMatches);

    const recipientIds = await this.filterByPreference(groupId, pendingUserIds, preferenceField);

    await this.sendToUsers(recipientIds, {
      title: 'Cierra la jornada',
      body: `${matchdayName} cierra en ${urgencyLabel} y todavía no has completado tu quiniela.`,
      data: { type: 'MATCHDAY_CLOSING_SOON', groupId, matchdayId },
    });
  }

  /**
   * Posicion actual del usuario en la clasificacion total del grupo: si el
   * grupo tiene mas de una competicion activa se usa la general
   * (competitionId null), igual que GroupsService.findMineForUser — mismo
   * criterio de alcance en toda la app.
   */
  private async getPositionForUser(groupId: string, userId: string): Promise<number | null> {
    const activeCompetitions = await this.prisma.groupCompetition.findMany({
      where: { groupId, isActive: true },
      select: { competitionId: true },
    });
    const competitionId = activeCompetitions.length === 1 ? activeCompetitions[0].competitionId : null;
    const snapshot = await this.prisma.rankingSnapshot.findFirst({
      where: { groupId, userId, period: 'TOTAL', competitionId },
      orderBy: { createdAt: 'desc' },
    });
    return snapshot?.position ?? null;
  }

  /**
   * Aviso de fin de jornada, uno por miembro con sus propios puntos y su
   * posicion actual en la clasificacion del grupo (no el mismo mensaje
   * generico para todos) — los puntos se calculan sumando pointsEarned de
   * sus predicciones de esa jornada, ya rellenado por
   * PredictionsService.scoreFinishedMatchday antes de llamar aqui.
   */
  async notifyMatchdayFinished(
    groupId: string,
    matchdayId: string,
    matchdayName: string,
  ): Promise<void> {
    const [members, predictions] = await Promise.all([
      this.prisma.groupMembership.findMany({ where: { groupId }, select: { userId: true } }),
      this.prisma.prediction.findMany({
        where: { groupId, match: { matchdayId } },
        select: { userId: true, pointsEarned: true },
      }),
    ]);

    const pointsByUser = new Map<string, number>(members.map((m) => [m.userId, 0]));
    for (const prediction of predictions) {
      pointsByUser.set(
        prediction.userId,
        (pointsByUser.get(prediction.userId) ?? 0) + (prediction.pointsEarned ?? 0),
      );
    }

    const recipientIds = await this.filterByPreference(
      groupId,
      [...pointsByUser.keys()],
      'matchdayFinishedResult',
    );
    const recipients = new Set(recipientIds);

    await Promise.all(
      [...pointsByUser.entries()]
        .filter(([userId]) => recipients.has(userId))
        .map(async ([userId, points]) => {
          const position = await this.getPositionForUser(groupId, userId);
          const positionText = position != null ? ` Vas ${position}º en la clasificación.` : '';
          await this.sendToUser(userId, {
            title: `${matchdayName} terminada`,
            body: `Has ganado ${points} ${points === 1 ? 'punto' : 'puntos'}.${positionText}`,
            data: { type: 'MATCHDAY_FINISHED', groupId, matchdayId },
          });
        }),
    );
  }

  /**
   * Insignia conseguida (activada por defecto). No se filtra por
   * GroupMembership.mutedNotifications: aunque se haya ganado en el
   * contexto de un grupo concreto, la insignia es de la cuenta, no del
   * grupo (ver UserBadge) — silenciar un grupo no debe ocultar un logro
   * propio. Solo se respeta la preferencia de cuenta `badgeEarned`.
   */
  async notifyBadgeEarned(userId: string, badgeName: string): Promise<void> {
    const preference = (await this.prisma.notificationPreference.findUnique({ where: { userId } })) ?? DEFAULT_NOTIFICATION_PREFERENCES;
    if (!preference.badgeEarned) return;

    await this.sendToUser(userId, {
      title: 'Nueva insignia',
      body: `Has conseguido "${badgeName}".`,
      data: { type: 'BADGE_EARNED' },
    });
  }
}
