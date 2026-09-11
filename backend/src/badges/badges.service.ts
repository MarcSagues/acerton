import { Injectable, Logger } from '@nestjs/common';
import { Badge } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const BADGE_CODES = {
  FIRST_MATCHDAY_PLAYED: 'FIRST_MATCHDAY_PLAYED',
  STREAK_5: 'STREAK_5',
  STREAK_10: 'STREAK_10',
  HOT_STREAK_5: 'HOT_STREAK_5',
  MATCHDAY_TOP_1: 'MATCHDAY_TOP_1',
} as const;

@Injectable()
export class BadgesService {
  private readonly logger = new Logger(BadgesService.name);

  constructor(private readonly prisma: PrismaService) {}

  findCatalog(): Promise<Badge[]> {
    return this.prisma.badge.findMany({ orderBy: { name: 'asc' } });
  }

  getForUser(userId: string) {
    return this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true, group: { select: { id: true, name: true } } },
      orderBy: { earnedAt: 'desc' },
    });
  }

  /**
   * % de usuarios (sobre el total registrado) que tienen al menos una fila
   * de UserBadge para cada insignia, sin contar dos veces a quien la haya
   * conseguido en mas de un grupo (UserBadge es unico por userId+badgeId+
   * groupId, no por userId+badgeId).
   */
  async getEarnStats(): Promise<Record<string, number>> {
    const [totalUsers, distinctPairs, badges] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userBadge.findMany({ distinct: ['badgeId', 'userId'], select: { badgeId: true } }),
      this.prisma.badge.findMany({ select: { id: true, code: true } }),
    ]);

    const earnersByBadge = new Map<string, number>();
    for (const { badgeId } of distinctPairs) {
      earnersByBadge.set(badgeId, (earnersByBadge.get(badgeId) ?? 0) + 1);
    }

    const result: Record<string, number> = {};
    for (const badge of badges) {
      const earners = earnersByBadge.get(badge.id) ?? 0;
      result[badge.code] = totalUsers > 0 ? Math.round((earners / totalUsers) * 100) : 0;
    }
    return result;
  }

  /**
   * Se ejecuta tras cerrar y puntuar una jornada, y tras recalcular rachas
   * y clasificacion semanal de esa jornada (el orden importa: streaks y
   * rankings deben estar actualizados antes de evaluar insignias).
   */
  async evaluateAfterMatchdayClose(groupId: string, matchdayId: string): Promise<void> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });

    for (const { userId } of members) {
      await this.checkFirstMatchdayPlayed(userId, groupId, matchdayId);
      await this.checkStreakBadges(userId, groupId, matchdayId);
      await this.checkHotStreak(userId, groupId, matchdayId);
    }

    await this.checkMatchdayTop1(groupId, matchdayId);
  }

  private async checkFirstMatchdayPlayed(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<void> {
    const predictions = await this.prisma.prediction.findMany({
      where: { userId, groupId },
      select: { match: { select: { matchdayId: true } } },
    });
    const matchdays = new Set(predictions.map((p) => p.match.matchdayId));
    if (matchdays.size === 1 && matchdays.has(matchdayId)) {
      await this.award(userId, BADGE_CODES.FIRST_MATCHDAY_PLAYED, groupId, matchdayId);
    }
  }

  private async checkStreakBadges(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<void> {
    const streak = await this.prisma.streak.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!streak) {
      return;
    }
    if (streak.currentStreak === 5) {
      await this.award(userId, BADGE_CODES.STREAK_5, groupId, matchdayId);
    }
    if (streak.currentStreak === 10) {
      await this.award(userId, BADGE_CODES.STREAK_10, groupId, matchdayId);
    }
  }

  private async checkHotStreak(userId: string, groupId: string, matchdayId: string): Promise<void> {
    const recentScored = await this.prisma.prediction.findMany({
      where: { userId, groupId, pointsEarned: { not: null } },
      orderBy: { match: { kickoff: 'desc' } },
      take: 5,
      select: { pointsEarned: true },
    });

    const allCorrect =
      recentScored.length === 5 && recentScored.every((p) => (p.pointsEarned ?? 0) > 0);

    if (allCorrect) {
      await this.award(userId, BADGE_CODES.HOT_STREAK_5, groupId, matchdayId);
    }
  }

  private async checkMatchdayTop1(groupId: string, matchdayId: string): Promise<void> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      return;
    }

    const winners = await this.prisma.rankingSnapshot.findMany({
      where: {
        groupId,
        matchdayId,
        period: 'WEEKLY',
        competitionId: matchday.competitionId,
        position: 1,
      },
    });

    for (const winner of winners) {
      await this.award(winner.userId, BADGE_CODES.MATCHDAY_TOP_1, groupId, matchdayId);
    }
  }

  private async award(
    userId: string,
    code: string,
    groupId: string,
    matchdayId?: string,
  ): Promise<void> {
    const badge = await this.prisma.badge.findUnique({ where: { code } });
    if (!badge) {
      this.logger.warn(`Insignia con codigo ${code} no existe en el catalogo`);
      return;
    }

    await this.prisma.userBadge.upsert({
      where: { userId_badgeId_groupId: { userId, badgeId: badge.id, groupId } },
      update: {},
      create: { userId, badgeId: badge.id, groupId, matchdayId },
    });
  }
}
