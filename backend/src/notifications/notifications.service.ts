import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';

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
   * Recordatorio de cierre a los miembros de un grupo que todavia no han
   * completado su quiniela de esta jornada (ni la han empezado, ni la han
   * enviado entera). `urgencyLabel` distingue el aviso de 5h/1h/30min para
   * que el mensaje suba de tono segun se acerca el cierre.
   */
  async notifyMatchdayClosingSoon(
    groupId: string,
    matchdayId: string,
    matchdayName: string,
    urgencyLabel: string,
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

    await this.sendToUsers(pendingUserIds, {
      title: 'Cierra la jornada',
      body: `${matchdayName} cierra en ${urgencyLabel} y todavia no has completado tu quiniela.`,
      data: { type: 'MATCHDAY_CLOSING_SOON', groupId, matchdayId },
    });
  }

  /**
   * Aviso de fin de jornada, uno por miembro con sus propios puntos (no el
   * mismo mensaje generico para todos) — se calculan sumando pointsEarned de
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

    await Promise.all(
      [...pointsByUser.entries()].map(([userId, points]) =>
        this.sendToUser(userId, {
          title: `${matchdayName} terminada`,
          body: `Has ganado ${points} ${points === 1 ? 'punto' : 'puntos'}. La clasificacion ya esta actualizada.`,
          data: { type: 'MATCHDAY_FINISHED', groupId, matchdayId },
        }),
      ),
    );
  }
}
