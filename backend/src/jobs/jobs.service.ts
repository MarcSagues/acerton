import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { PredictionsService } from '../predictions/predictions.service';
import { RankingsService } from '../rankings/rankings.service';
import { StreaksService } from '../streaks/streaks.service';
import { BadgesService } from '../badges/badges.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SeasonsService } from '../seasons/seasons.service';
import { XpService } from '../xp/xp.service';
import { shouldSendMatchReminder } from '../matchdays/matchday.util';
import { NotificationPreferenceFields } from '../notifications/notification-preferences.service';

type ReminderField = 'reminder24hSentAt' | 'reminder5hSentAt' | 'reminder1hSentAt' | 'reminder30mSentAt';

interface ReminderTier {
  field: ReminderField;
  windowMs: number;
  urgencyLabel: string;
  /** Preferencia de cuenta que gobierna esta franja (product-rules.md: seleccion multiple, independientes entre si). */
  preferenceField: keyof NotificationPreferenceFields;
}

/**
 * Cuatro avisos escalonados antes del cierre de una jornada, cada uno
 * independiente (se dispara como mucho una vez por jornada, y cada usuario
 * decide por separado que franjas quiere recibir — ver
 * NotificationPreference). Se comprueban de la mas lejana a la mas cercana;
 * cada uno solo llega a quien todavia no ha completado su quiniela en ese
 * momento y tiene esa franja concreta activada.
 */
const REMINDER_TIERS: ReminderTier[] = [
  { field: 'reminder24hSentAt', windowMs: 24 * 60 * 60 * 1000, urgencyLabel: '24 horas', preferenceField: 'reminder24h' },
  { field: 'reminder5hSentAt', windowMs: 5 * 60 * 60 * 1000, urgencyLabel: '5 horas', preferenceField: 'reminder5h' },
  { field: 'reminder1hSentAt', windowMs: 60 * 60 * 1000, urgencyLabel: '1 hora', preferenceField: 'reminder1h' },
  { field: 'reminder30mSentAt', windowMs: 30 * 60 * 1000, urgencyLabel: '30 minutos', preferenceField: 'reminder30m' },
];

@Injectable()
export class JobsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchdaysService: MatchdaysService,
    private readonly predictionsService: PredictionsService,
    private readonly rankingsService: RankingsService,
    private readonly streaksService: StreaksService,
    private readonly badgesService: BadgesService,
    private readonly notificationsService: NotificationsService,
    private readonly seasonsService: SeasonsService,
    private readonly xpService: XpService,
  ) {}

  /**
   * El servicio esta en el plan gratuito de Render, que se duerme sin
   * trafico — mientras duerme, ningun @Cron corre, asi que tras un arranque
   * en frio los resultados/puntos podian quedarse hasta 10 min desfasados
   * esperando al siguiente tick programado. Ejecutar esto una vez al
   * arrancar el proceso (ademas del cron normal) hace que el primer usuario
   * que despierta el servicio no tenga que esperar ese margen.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.matchdaysService.closeDueMatchdays();
    await this.syncResultsAndFinalize();
  }

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
   * Envia los recordatorios de cierre (24h / 5h / 1h / 30min antes) a quien
   * todavia no ha pronosticado un partido concreto — anclados al kickoff de
   * CADA partido, no al cierre global de la jornada (que solo refleja el
   * primer partido): una jornada repartida en varios dias avisa de cada uno
   * segun cuando empieza de verdad el, no solo del primero. Corre cada 5
   * minutos para que el aviso de "30 minutos" tenga margen de precision.
   *
   * Los partidos que entran a la vez en una misma franja se agrupan por
   * jornada para mandar un unico aviso consolidado por destinatario en vez
   * de una notificacion suelta por partido (evita una rafaga cuando varios
   * partidos de la misma jornada empiezan casi a la vez).
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendClosingReminders(): Promise<void> {
    const now = new Date();
    // De la franja mas urgente (30min) a la menos (24h): un partido que ya
    // esta a 20 minutos de empezar tambien cumple, tecnicamente, la ventana
    // de 24h/5h/1h — sin esto, la primera vez que corre este cron para un
    // partido concreto (p.ej. justo tras desplegar, con los 4 campos recien
    // creados a null) le llegarian las 4 franjas seguidas de golpe en la
    // misma pasada. Una vez una franja "reclama" un partido en esta pasada,
    // las franjas menos urgentes lo ignoran (no tiene sentido avisar de un
    // cierre "en 24h" a quien ya esta a 20 minutos del pitido inicial).
    const claimedMatchIds = new Set<string>();

    for (const tier of [...REMINDER_TIERS].reverse()) {
      const candidates = await this.prisma.match.findMany({
        where: { status: 'SCHEDULED', [tier.field]: null, matchday: { status: 'OPEN' } },
        include: { matchday: true },
      });
      const dueMatches = candidates.filter(
        (match) =>
          !claimedMatchIds.has(match.id) &&
          shouldSendMatchReminder(
            { status: match.status, kickoff: match.kickoff, reminderSentAt: match[tier.field] },
            tier.windowMs,
            now,
          ),
      );
      if (dueMatches.length === 0) continue;
      for (const match of dueMatches) claimedMatchIds.add(match.id);

      const matchdayIds = [...new Set(dueMatches.map((match) => match.matchdayId))];
      for (const matchdayId of matchdayIds) {
        const matchesForMatchday = dueMatches.filter((match) => match.matchdayId === matchdayId);
        const { competitionId, name: matchdayName } = matchesForMatchday[0].matchday;
        const matchIds = matchesForMatchday.map((match) => match.id);

        const groupCompetitions = await this.prisma.groupCompetition.findMany({
          where: { competitionId, isActive: true },
        });

        for (const gc of groupCompetitions) {
          await this.notificationsService.notifyMatchesClosingSoon(
            gc.groupId,
            matchdayId,
            matchdayName,
            matchIds,
            tier.urgencyLabel,
            tier.preferenceField,
          );
        }
      }

      await this.prisma.match.updateMany({
        where: { id: { in: dueMatches.map((match) => match.id) } },
        data: { [tier.field]: now },
      });
    }
  }

  /**
   * "Piqo te echa de menos": avisa a quien lleva 4 dias sin abrir la app
   * (User.lastActiveAt, actualizado en cualquier login/refresh — ver
   * AuthService.issueTokens) y a quien no se le haya avisado ya de esta
   * misma racha de inactividad (reengagementPushSentAt mas reciente que
   * lastActiveAt significa que ya se le aviso desde la ultima vez que entro,
   * asi que no hay que repetirselo cada dia mientras siga sin volver).
   * Se excluye a quien nunca tiene lastActiveAt registrado (cuentas de antes
   * de este campo, sin una fecha real de la que partir) y a quien no
   * pertenece a ningun grupo (el aviso asume que hay un grupo esperandole).
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendReengagementNotifications(): Promise<void> {
    const now = new Date();
    const threshold = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);

    const candidates = await this.prisma.user.findMany({
      where: { lastActiveAt: { not: null, lte: threshold }, memberships: { some: {} } },
      select: { id: true, lastActiveAt: true, reengagementPushSentAt: true },
    });
    const dueUserIds = candidates
      .filter((user) => !user.reengagementPushSentAt || user.reengagementPushSentAt <= user.lastActiveAt!)
      .map((user) => user.id);
    if (dueUserIds.length === 0) return;

    await this.notificationsService.notifyReengagement(dueUserIds);
    await this.prisma.user.updateMany({ where: { id: { in: dueUserIds } }, data: { reengagementPushSentAt: now } });
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
    let inProgress: string[] = [];
    try {
      ({ newlyFinished, inProgress } = await this.matchdaysService.syncResultsForClosedMatchdays());
    } catch (error) {
      this.logger.error('Error sincronizando resultados', error as Error);
      return;
    }

    for (const matchdayId of newlyFinished) {
      await this.finalizeMatchday(matchdayId);
    }
    for (const matchdayId of inProgress) {
      await this.updateProvisionalScores(matchdayId);
    }
  }

  /**
   * Jornada cerrada pero todavia no terminada del todo: puntua y recalcula
   * clasificacion solo con los partidos ya decididos, para que la Tabla no
   * tenga que esperar al ultimo partido de la jornada (ver
   * PredictionsService.scoreFinishedMatchday, que ya ignora los partidos
   * pendientes). Sin rachas/insignias/notificacion de cierre: esos son
   * eventos de jornada terminada del todo, no de progreso parcial.
   */
  private async updateProvisionalScores(matchdayId: string): Promise<void> {
    await this.predictionsService.scoreFinishedMatchday(matchdayId);
    await this.rankingsService.computeForFinishedMatchday(matchdayId);
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

    try {
      await this.seasonsService.checkSeasonClosureAfterMatchdayFinished(
        matchday.competitionId,
        matchday.closesAt,
      );
    } catch (error) {
      this.logger.error(`Error comprobando cierre de temporada para ${matchday.competitionId}`, error as Error);
    }

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
      const newlyAwarded = await this.badgesService.evaluateAfterMatchdayClose(gc.groupId, matchdayId);
      for (const { userId, badgeName } of newlyAwarded) {
        await this.notificationsService.notifyBadgeEarned(userId, badgeName);
      }
      await this.xpService.evaluateAfterMatchdayClose(gc.groupId, matchdayId);
      await this.notificationsService.notifyMatchdayFinished(gc.groupId, matchdayId, matchdayName);
    }
  }
}
