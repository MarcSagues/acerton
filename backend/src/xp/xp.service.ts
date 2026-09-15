import { Injectable, Logger } from '@nestjs/common';
import { XpEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { XP_VALUES, xpProgressForLevel } from './xp.util';

interface XpAward {
  type: XpEventType;
  amount: number;
}

export interface LevelUpEvent {
  userId: string;
  level: number;
}

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * XP inmediata al pronosticar un partido por primera vez (a peticion
   * explicita del usuario: la barra de nivel debe notarse nada mas
   * participar, no solo al cerrar la jornada). Se concede una sola vez por
   * partido/grupo/usuario — el llamador (PredictionsService.submit) es
   * quien decide si es la primera vez comprobando si ya existia
   * prediccion antes del upsert, asi que volver a cambiar el pronostico
   * despues no vuelve a dar XP. El resto de fuentes (aciertos, pleno de
   * jornada) se siguen calculando solo al cerrar la jornada en
   * evaluateAfterMatchdayClose, porque dependen del resultado real del
   * partido.
   */
  async awardParticipation(userId: string, groupId: string, matchdayId: string): Promise<LevelUpEvent | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { experience: true } });
    if (!user) {
      return null;
    }
    const previousLevel = xpProgressForLevel(user.experience).level;
    const newLevel = await this.award(
      userId,
      groupId,
      matchdayId,
      [{ type: 'PARTICIPATION', amount: XP_VALUES.PARTICIPATION }],
      user.experience,
    );
    return newLevel !== null && newLevel > previousLevel ? { userId, level: newLevel } : null;
  }

  /**
   * Se ejecuta tras cerrar y puntuar una jornada (mismo punto de enganche
   * que BadgesService.evaluateAfterMatchdayClose, ver JobsService). La XP
   * de participar ya no se concede aqui (ver awardParticipation, se
   * concede en tiempo real al pronosticar) — esta pasada solo cubre lo
   * que depende del resultado real del partido: aciertos y pleno de
   * jornada. Todavia sin implementar: XP por invitar a un amigo (depende
   * del sistema de referidos, ver roadmap.md Sprint 14) y por racha
   * diaria de entrar a la app.
   *
   * Devuelve quien ha subido de nivel en esta pasada (no cada vez que gana
   * XP), para que JobsService pueda avisar solo de eso — igual patron que
   * BadgesService devolviendo solo las insignias recien concedidas.
   */
  async evaluateAfterMatchdayClose(groupId: string, matchdayId: string): Promise<LevelUpEvent[]> {
    const [group, members, matchday] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId }, select: { scoringMode: true } }),
      this.prisma.groupMembership.findMany({
        where: { groupId },
        select: { userId: true, user: { select: { experience: true } } },
      }),
      this.prisma.matchday.findUnique({ where: { id: matchdayId }, select: { matches: { select: { id: true } } } }),
    ]);
    if (!group || !matchday) {
      return [];
    }
    const totalMatches = matchday.matches.length;

    const levelUps: LevelUpEvent[] = [];
    for (const { userId, user } of members) {
      const predictions = await this.prisma.prediction.findMany({
        where: { userId, groupId, match: { matchdayId } },
        select: {
          pointsEarned: true,
          doubleChanceOption: true,
          doublePointsWildcard: true,
          predictedHomeScore: true,
          predictedAwayScore: true,
          match: { select: { homeScore: true, awayScore: true } },
        },
      });
      if (predictions.length === 0) {
        continue;
      }

      const awards: XpAward[] = [];

      for (const prediction of predictions) {
        if ((prediction.pointsEarned ?? 0) <= 0) {
          continue;
        }
        if (group.scoringMode === 'EXACT_SCORE') {
          const exact =
            prediction.predictedHomeScore != null &&
            prediction.predictedAwayScore != null &&
            prediction.match.homeScore != null &&
            prediction.match.awayScore != null &&
            prediction.predictedHomeScore === prediction.match.homeScore &&
            prediction.predictedAwayScore === prediction.match.awayScore;
          awards.push(
            exact
              ? { type: 'EXACT_SCORE_HIT', amount: XP_VALUES.EXACT_SCORE_HIT }
              : { type: 'EXACT_SCORE_WINNER', amount: XP_VALUES.EXACT_SCORE_WINNER },
          );
        } else {
          awards.push(
            prediction.doubleChanceOption
              ? { type: 'WIN_1X2_WILDCARD', amount: XP_VALUES.WIN_1X2_WILDCARD }
              : { type: 'WIN_1X2', amount: XP_VALUES.WIN_1X2 },
          );
        }
      }

      const perfect =
        totalMatches > 0 &&
        predictions.length === totalMatches &&
        predictions.every((p) => (p.pointsEarned ?? 0) > 0);
      if (perfect) {
        awards.push(
          group.scoringMode === 'EXACT_SCORE'
            ? { type: 'PERFECT_MATCHDAY_EXACT', amount: XP_VALUES.PERFECT_MATCHDAY_EXACT }
            : { type: 'PERFECT_MATCHDAY_1X2', amount: XP_VALUES.PERFECT_MATCHDAY_1X2 },
        );
      }

      const newLevel = await this.award(userId, groupId, matchdayId, awards, user.experience);
      const previousLevel = xpProgressForLevel(user.experience).level;
      if (newLevel !== null && newLevel > previousLevel) {
        levelUps.push({ userId, level: newLevel });
      }
    }
    return levelUps;
  }

  /** Devuelve el nivel resultante tras aplicar el award, o null si no se concedio nada (o fallo). */
  private async award(
    userId: string,
    groupId: string,
    matchdayId: string,
    awards: XpAward[],
    previousExperience: number,
  ): Promise<number | null> {
    if (awards.length === 0) {
      return null;
    }
    const total = awards.reduce((sum, a) => sum + a.amount, 0);
    try {
      await this.prisma.$transaction([
        this.prisma.xpEvent.createMany({
          data: awards.map((a) => ({ userId, type: a.type, amount: a.amount, groupId, matchdayId })),
        }),
        this.prisma.user.update({ where: { id: userId }, data: { experience: { increment: total } } }),
      ]);
      return xpProgressForLevel(previousExperience + total).level;
    } catch (error) {
      this.logger.warn(`No se pudo conceder XP a ${userId} en jornada ${matchdayId}: ${error}`);
      return null;
    }
  }
}
