import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { PredictionsService } from '../predictions/predictions.service';
import { RankingsService } from '../rankings/rankings.service';
import { StreaksService } from '../streaks/streaks.service';
import { BadgesService } from '../badges/badges.service';
import { NotificationsService } from '../notifications/notifications.service';
import { shouldSendReminder } from '../matchdays/matchday.util';

type ReminderField = 'reminder5hSentAt' | 'reminder1hSentAt' | 'reminder30mSentAt';

interface ReminderTier {
  field: ReminderField;
  windowMs: number;
  urgencyLabel: string;
}

/**
 * Tres avisos escalonados antes del cierre de una jornada, cada uno
 * independiente (se dispara como mucho una vez por jornada). Se comprueban
 * de la mas lejana a la mas cercana; cada uno solo llega a quien todavia no
 * ha completado su quiniela en ese momento.
 */
const REMINDER_TIERS: ReminderTier[] = [
  { field: 'reminder5hSentAt', windowMs: 5 * 60 * 60 * 1000, urgencyLabel: '5 horas' },
  { field: 'reminder1hSentAt', windowMs: 60 * 60 * 1000, urgencyLabel: '1 hora' },
  { field: 'reminder30mSentAt', windowMs: 30 * 60 * 1000, urgencyLabel: '30 minutos' },
];

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchdaysService: MatchdaysService,
    private readonly predictionsService: PredictionsService,
    private readonly rankingsService: RankingsService,
    private readonly streaksService: StreaksService,
    private readonly badgesService: BadgesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Trae la jornada en curso de cada competicion usada por al menos un
   * grupo. Corre cada 12h porque MatchdaysService.syncCurrentRound ya se
   * salta la llamada al proveedor si la jornada vigente no ha cambiado —
   * no hace falta mas frecuencia que esa para detectar una jornada nueva.
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async syncUpcomingFixtures(): Promise<void> {
    const usedCompetitions = await this.prisma.groupCompetition.findMany({
      where: { isActive: true },
      distinct: ['competitionId'],
      select: { competitionId: true },
    });

    for (const { competitionId } of usedCompetitions) {
      try {
        await this.matchdaysService.syncCurrentRound(competitionId);
      } catch (error) {
        this.logger.error(`Error sincronizando competicion ${competitionId}`, error as Error);
      }
    }
  }

  /**
   * Envia los recordatorios de cierre (5h / 1h / 30min antes) a quien
   * todavia no ha completado su quiniela. Corre cada 5 minutos para que el
   * aviso de "30 minutos" tenga margen suficiente de precision.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendClosingReminders(): Promise<void> {
    const now = new Date();

    for (const tier of REMINDER_TIERS) {
      const candidates = await this.prisma.matchday.findMany({
        where: { status: 'OPEN', [tier.field]: null },
      });
      const matchdays = candidates.filter((matchday) =>
        shouldSendReminder(
          {
            status: matchday.status,
            closesAt: matchday.closesAt,
            reminderSentAt: matchday[tier.field],
          },
          tier.windowMs,
          now,
        ),
      );

      for (const matchday of matchdays) {
        const groupCompetitions = await this.prisma.groupCompetition.findMany({
          where: { competitionId: matchday.competitionId, isActive: true },
        });

        for (const gc of groupCompetitions) {
          await this.notificationsService.notifyMatchdayClosingSoon(
            gc.groupId,
            matchday.id,
            matchday.name,
            tier.urgencyLabel,
          );
        }

        await this.prisma.matchday.update({
          where: { id: matchday.id },
          data: { [tier.field]: now },
        });
      }
    }
  }

  /**
   * Cierra jornadas cuyo plazo ha pasado. Corre cada minuto (mas seguido que
   * el resto de jobs) porque de este status depende que las predicciones del
   * grupo se hagan visibles a los demas miembros (ver PredictionsService) —
   * la validacion que impide enviar/editar tras el cierre ya se hace contra
   * closesAt en tiempo real en PredictionsService.submit, independientemente
   * de este cron, asi que aqui solo importa la latencia de propagacion.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async closeDueMatchdays(): Promise<void> {
    await this.matchdaysService.closeDueMatchdays();
  }

  /**
   * Sincroniza resultados de jornadas cerradas y dispara
   * puntuacion/rankings/rachas/insignias/notificaciones al finalizar. Cada
   * 10 min: MatchdaysService.syncResultsForClosedMatchdays ya agrupa todos
   * los partidos pendientes de todas las jornadas en una sola peticion (o
   * ninguna si no hay nada pendiente), asi que este intervalo es sobre todo
   * margen de precision, no gasto de cupo.
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async syncResultsAndFinalize(): Promise<void> {
    let newlyFinished: string[] = [];
    try {
      newlyFinished = await this.matchdaysService.syncResultsForClosedMatchdays();
    } catch (error) {
      this.logger.error('Error sincronizando resultados', error as Error);
      return;
    }

    for (const matchdayId of newlyFinished) {
      await this.finalizeMatchday(matchdayId);
    }
  }

  private async finalizeMatchday(matchdayId: string): Promise<void> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      return;
    }

    await this.predictionsService.scoreFinishedMatchday(matchdayId);
    await this.rankingsService.computeForFinishedMatchday(matchdayId);
    await this.streaksService.updateAfterMatchdayClose(matchdayId);
    await this.badgesEvaluateAndNotify(matchday.competitionId, matchdayId, matchday.name);

    this.logger.log(`Jornada ${matchdayId} finalizada y procesada por completo`);
  }

  private async badgesEvaluateAndNotify(
    competitionId: string,
    matchdayId: string,
    matchdayName: string,
  ): Promise<void> {
    const groupCompetitions = await this.prisma.groupCompetition.findMany({
      where: { competitionId, isActive: true },
    });

    for (const gc of groupCompetitions) {
      await this.badgesService.evaluateAfterMatchdayClose(gc.groupId, matchdayId);
      await this.notificationsService.notifyMatchdayFinished(gc.groupId, matchdayId, matchdayName);
    }
  }
}
