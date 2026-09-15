import { Injectable, Logger } from '@nestjs/common';
import { XpEventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { XP_VALUES } from './xp.util';

interface XpAward {
  type: XpEventType;
  amount: number;
}

@Injectable()
export class XpService {
  private readonly logger = new Logger(XpService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Se ejecuta tras cerrar y puntuar una jornada (mismo punto de enganche
   * que BadgesService.evaluateAfterMatchdayClose, ver JobsService). Todavia
   * sin implementar: XP por invitar a un amigo (depende del sistema de
   * referidos, ver roadmap.md Sprint 14) y por racha diaria de entrar a la
   * app — solo las fuentes ligadas a los pronosticos de esta jornada.
   */
  async evaluateAfterMatchdayClose(groupId: string, matchdayId: string): Promise<void> {
    const [group, members, matchday] = await Promise.all([
      this.prisma.group.findUnique({ where: { id: groupId }, select: { scoringMode: true } }),
      this.prisma.groupMembership.findMany({ where: { groupId }, select: { userId: true } }),
      this.prisma.matchday.findUnique({ where: { id: matchdayId }, select: { matches: { select: { id: true } } } }),
    ]);
    if (!group || !matchday) {
      return;
    }
    const totalMatches = matchday.matches.length;

    for (const { userId } of members) {
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

      const awards: XpAward[] = [{ type: 'PARTICIPATION', amount: XP_VALUES.PARTICIPATION }];

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

      await this.award(userId, groupId, matchdayId, awards);
    }
  }

  private async award(userId: string, groupId: string, matchdayId: string, awards: XpAward[]): Promise<void> {
    if (awards.length === 0) {
      return;
    }
    const total = awards.reduce((sum, a) => sum + a.amount, 0);
    try {
      await this.prisma.$transaction([
        this.prisma.xpEvent.createMany({
          data: awards.map((a) => ({ userId, type: a.type, amount: a.amount, groupId, matchdayId })),
        }),
        this.prisma.user.update({ where: { id: userId }, data: { experience: { increment: total } } }),
      ]);
    } catch (error) {
      this.logger.warn(`No se pudo conceder XP a ${userId} en jornada ${matchdayId}: ${error}`);
    }
  }
}
