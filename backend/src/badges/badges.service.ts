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

/**
 * Umbral de cada insignia con progreso medible (product-rules.md
 * "Insignias": "Progreso numerico y barra cuando la condicion sea
 * medible"). FIRST_MATCHDAY_PLAYED y MATCHDAY_TOP_1 se quedan fuera a
 * proposito: son logros de un solo evento (jugar una jornada, quedar 1º en
 * una jornada concreta), no algo que se acumule hacia un numero — un
 * "0/1" no aporta nada que el propio candado no diga ya. Se reutiliza el
 * mismo numero aqui y en award() para que el progreso mostrado y la
 * condicion real de concesion nunca puedan desincronizarse.
 */
export const BADGE_TARGETS: Partial<Record<keyof typeof BADGE_CODES, number>> = {
  STREAK_5: 5,
  STREAK_10: 10,
  HOT_STREAK_5: 5,
};

export interface BadgeProgress {
  current: number;
  target: number;
}

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
   * rankings deben estar actualizados antes de evaluar insignias). Devuelve
   * las insignias recien concedidas en esta pasada (no las que ya se
   * tenian) para que JobsService pueda avisar solo de logros nuevos.
   */
  async evaluateAfterMatchdayClose(
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const newlyAwarded: { userId: string; badgeName: string }[] = [];
    for (const { userId } of members) {
      newlyAwarded.push(...(await this.checkFirstMatchdayPlayed(userId, groupId, matchdayId)));
      newlyAwarded.push(...(await this.checkStreakBadges(userId, groupId, matchdayId)));
      newlyAwarded.push(...(await this.checkHotStreak(userId, groupId, matchdayId)));
    }

    newlyAwarded.push(...(await this.checkMatchdayTop1(groupId, matchdayId)));
    return newlyAwarded;
  }

  private async checkFirstMatchdayPlayed(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const predictions = await this.prisma.prediction.findMany({
      where: { userId, groupId },
      select: { match: { select: { matchdayId: true } } },
    });
    const matchdays = new Set(predictions.map((p) => p.match.matchdayId));
    if (matchdays.size === 1 && matchdays.has(matchdayId)) {
      return this.award(userId, BADGE_CODES.FIRST_MATCHDAY_PLAYED, groupId, matchdayId);
    }
    return [];
  }

  private async checkStreakBadges(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const streak = await this.prisma.streak.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!streak) {
      return [];
    }
    const awarded: { userId: string; badgeName: string }[] = [];
    if (streak.currentStreak === BADGE_TARGETS.STREAK_5) {
      awarded.push(...(await this.award(userId, BADGE_CODES.STREAK_5, groupId, matchdayId)));
    }
    if (streak.currentStreak === BADGE_TARGETS.STREAK_10) {
      awarded.push(...(await this.award(userId, BADGE_CODES.STREAK_10, groupId, matchdayId)));
    }
    return awarded;
  }

  private async checkHotStreak(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const target = BADGE_TARGETS.HOT_STREAK_5!;
    const recentScored = await this.prisma.prediction.findMany({
      where: { userId, groupId, pointsEarned: { not: null } },
      orderBy: { match: { kickoff: 'desc' } },
      take: target,
      select: { pointsEarned: true },
    });

    const allCorrect =
      recentScored.length === target && recentScored.every((p) => (p.pointsEarned ?? 0) > 0);

    if (allCorrect) {
      return this.award(userId, BADGE_CODES.HOT_STREAK_5, groupId, matchdayId);
    }
    return [];
  }

  /**
   * Progreso hacia cada insignia medible, sobre todos los grupos del
   * usuario (el mayor valor de cualquiera de ellos, ya que basta con
   * llegar al umbral en uno solo para desbloquearla — ver award()). Solo
   * se calcula para quien todavia no la tiene: el frontend no pide esto
   * para insignias ya conseguidas.
   */
  async getProgressForUser(userId: string): Promise<Record<string, BadgeProgress>> {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId },
      select: { groupId: true },
    });
    const groupIds = memberships.map((m) => m.groupId);

    const streaks = groupIds.length
      ? await this.prisma.streak.findMany({ where: { userId, groupId: { in: groupIds } } })
      : [];
    const bestStreak = streaks.reduce((max, s) => Math.max(max, s.currentStreak), 0);

    const hotStreaks = await Promise.all(
      groupIds.map((groupId) => this.currentHotStreakForGroup(userId, groupId)),
    );
    const bestHotStreak = hotStreaks.reduce((max, value) => Math.max(max, value), 0);

    return {
      [BADGE_CODES.STREAK_5]: { current: Math.min(bestStreak, BADGE_TARGETS.STREAK_5!), target: BADGE_TARGETS.STREAK_5! },
      [BADGE_CODES.STREAK_10]: { current: Math.min(bestStreak, BADGE_TARGETS.STREAK_10!), target: BADGE_TARGETS.STREAK_10! },
      [BADGE_CODES.HOT_STREAK_5]: { current: bestHotStreak, target: BADGE_TARGETS.HOT_STREAK_5! },
    };
  }

  /** Aciertos consecutivos mas recientes en este grupo, empezando por el ultimo partido puntuado (0 si el ultimo fallo). */
  private async currentHotStreakForGroup(userId: string, groupId: string): Promise<number> {
    const target = BADGE_TARGETS.HOT_STREAK_5!;
    const recentScored = await this.prisma.prediction.findMany({
      where: { userId, groupId, pointsEarned: { not: null } },
      orderBy: { match: { kickoff: 'desc' } },
      take: target,
      select: { pointsEarned: true },
    });

    let streak = 0;
    for (const prediction of recentScored) {
      if ((prediction.pointsEarned ?? 0) > 0) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  }

  private async checkMatchdayTop1(
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      return [];
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

    const awarded: { userId: string; badgeName: string }[] = [];
    for (const winner of winners) {
      awarded.push(...(await this.award(winner.userId, BADGE_CODES.MATCHDAY_TOP_1, groupId, matchdayId)));
    }
    return awarded;
  }

  /** Devuelve un array con la insignia si se ha concedido de verdad ahora (vacio si ya se tenia). */
  private async award(
    userId: string,
    code: string,
    groupId: string,
    matchdayId?: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const badge = await this.prisma.badge.findUnique({ where: { code } });
    if (!badge) {
      this.logger.warn(`Insignia con codigo ${code} no existe en el catalogo`);
      return [];
    }

    const existing = await this.prisma.userBadge.findUnique({
      where: { userId_badgeId_groupId: { userId, badgeId: badge.id, groupId } },
    });
    if (existing) {
      return [];
    }

    await this.prisma.userBadge.create({ data: { userId, badgeId: badge.id, groupId, matchdayId } });
    return [{ userId, badgeName: badge.name }];
  }
}
