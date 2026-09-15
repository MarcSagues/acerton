import { Injectable, Logger } from '@nestjs/common';
import { Badge } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const BADGE_CODES = {
  FIRST_MATCHDAY_PLAYED: 'FIRST_MATCHDAY_PLAYED',
  STREAK_5: 'STREAK_5',
  STREAK_10: 'STREAK_10',
  STREAK_25: 'STREAK_25',
  HOT_STREAK_5: 'HOT_STREAK_5',
  MATCHDAY_TOP_1: 'MATCHDAY_TOP_1',
  PREDICTIONS_100: 'PREDICTIONS_100',
  ONE_X_TWO_HITS_25: 'ONE_X_TWO_HITS_25',
  ONE_X_TWO_HITS_100: 'ONE_X_TWO_HITS_100',
  EXACT_SCORE_HIT_1: 'EXACT_SCORE_HIT_1',
  EXACT_SCORE_HITS_10: 'EXACT_SCORE_HITS_10',
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
  STREAK_25: 25,
  HOT_STREAK_5: 5,
  PREDICTIONS_100: 100,
  ONE_X_TWO_HITS_25: 25,
  ONE_X_TWO_HITS_100: 100,
  EXACT_SCORE_HITS_10: 10,
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
    const [members, group] = await Promise.all([
      this.prisma.groupMembership.findMany({ where: { groupId }, select: { userId: true } }),
      this.prisma.group.findUnique({ where: { id: groupId }, select: { scoringMode: true } }),
    ]);
    const scoringMode = group?.scoringMode ?? 'ONE_X_TWO';

    const newlyAwarded: { userId: string; badgeName: string }[] = [];
    for (const { userId } of members) {
      newlyAwarded.push(...(await this.checkFirstMatchdayPlayed(userId, groupId, matchdayId)));
      newlyAwarded.push(...(await this.checkStreakBadges(userId, groupId, matchdayId)));
      newlyAwarded.push(...(await this.checkHotStreak(userId, groupId, matchdayId)));
      newlyAwarded.push(...(await this.checkPredictionsMilestones(userId, groupId, matchdayId)));
      if (scoringMode === 'ONE_X_TWO') {
        newlyAwarded.push(...(await this.checkOneXTwoHitMilestones(userId, groupId, matchdayId)));
      } else {
        newlyAwarded.push(...(await this.checkExactScoreHitMilestones(userId, groupId, matchdayId)));
      }
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
    if (streak.currentStreak === BADGE_TARGETS.STREAK_25) {
      awarded.push(...(await this.award(userId, BADGE_CODES.STREAK_25, groupId, matchdayId)));
    }
    return awarded;
  }

  /** "Centenario": 100 pronosticos enviados en este grupo (cualquier partido con prediccion guardada, acertado o no). */
  private async checkPredictionsMilestones(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const total = await this.prisma.prediction.count({ where: { userId, groupId } });
    if (total === BADGE_TARGETS.PREDICTIONS_100) {
      return this.award(userId, BADGE_CODES.PREDICTIONS_100, groupId, matchdayId);
    }
    return [];
  }

  /**
   * "Buen ojo"/"Experto en 1X2": aciertos totales en grupos de modo 1X2 (doble
   * oportunidad incluida, igual que en el resto de la app — ver scoring.util).
   * Solo se llama para grupos ONE_X_TWO (ver evaluateAfterMatchdayClose).
   */
  private async checkOneXTwoHitMilestones(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const hits = await this.prisma.prediction.count({
      where: { userId, groupId, pointsEarned: { gt: 0 } },
    });
    const awarded: { userId: string; badgeName: string }[] = [];
    if (hits === BADGE_TARGETS.ONE_X_TWO_HITS_25) {
      awarded.push(...(await this.award(userId, BADGE_CODES.ONE_X_TWO_HITS_25, groupId, matchdayId)));
    }
    if (hits === BADGE_TARGETS.ONE_X_TWO_HITS_100) {
      awarded.push(...(await this.award(userId, BADGE_CODES.ONE_X_TWO_HITS_100, groupId, matchdayId)));
    }
    return awarded;
  }

  /**
   * "Al milímetro"/"Francotirador": marcadores exactos acertados en grupos de
   * modo resultado exacto (el marcador previsto coincide con el real — no
   * basta con acertar solo el ganador). Solo se llama para grupos EXACT_SCORE.
   */
  private async checkExactScoreHitMilestones(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<{ userId: string; badgeName: string }[]> {
    const hits = await this.countExactScoreHits(userId, groupId);
    const awarded: { userId: string; badgeName: string }[] = [];
    if (hits >= 1) {
      awarded.push(...(await this.award(userId, BADGE_CODES.EXACT_SCORE_HIT_1, groupId, matchdayId)));
    }
    if (hits === BADGE_TARGETS.EXACT_SCORE_HITS_10) {
      awarded.push(...(await this.award(userId, BADGE_CODES.EXACT_SCORE_HITS_10, groupId, matchdayId)));
    }
    return awarded;
  }

  /**
   * Prisma no permite comparar dos columnas propias en un `where` (aqui,
   * marcador previsto contra marcador real de otra tabla) sin SQL crudo, asi
   * que se trae lo necesario de cada prediccion puntuada y se compara en JS
   * — mismo patron que currentHotStreakForGroup mas abajo.
   */
  private async countExactScoreHits(userId: string, groupId: string): Promise<number> {
    const predictions = await this.prisma.prediction.findMany({
      where: {
        userId,
        groupId,
        predictedHomeScore: { not: null },
        predictedAwayScore: { not: null },
      },
      select: {
        predictedHomeScore: true,
        predictedAwayScore: true,
        match: { select: { homeScore: true, awayScore: true } },
      },
    });
    return predictions.filter(
      (p) =>
        p.match.homeScore != null &&
        p.match.awayScore != null &&
        p.predictedHomeScore === p.match.homeScore &&
        p.predictedAwayScore === p.match.awayScore,
    ).length;
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
      select: { groupId: true, group: { select: { scoringMode: true } } },
    });
    const groupIds = memberships.map((m) => m.groupId);
    const oneXTwoGroupIds = memberships.filter((m) => m.group.scoringMode === 'ONE_X_TWO').map((m) => m.groupId);
    const exactScoreGroupIds = memberships.filter((m) => m.group.scoringMode === 'EXACT_SCORE').map((m) => m.groupId);

    const streaks = groupIds.length
      ? await this.prisma.streak.findMany({ where: { userId, groupId: { in: groupIds } } })
      : [];
    const bestStreak = streaks.reduce((max, s) => Math.max(max, s.currentStreak), 0);

    const [hotStreaks, predictionTotals, oneXTwoHitTotals, exactScoreHitTotals] = await Promise.all([
      Promise.all(groupIds.map((groupId) => this.currentHotStreakForGroup(userId, groupId))),
      Promise.all(groupIds.map((groupId) => this.prisma.prediction.count({ where: { userId, groupId } }))),
      Promise.all(
        oneXTwoGroupIds.map((groupId) =>
          this.prisma.prediction.count({ where: { userId, groupId, pointsEarned: { gt: 0 } } }),
        ),
      ),
      Promise.all(exactScoreGroupIds.map((groupId) => this.countExactScoreHits(userId, groupId))),
    ]);
    const bestHotStreak = hotStreaks.reduce((max, value) => Math.max(max, value), 0);
    const bestPredictions = predictionTotals.reduce((max, value) => Math.max(max, value), 0);
    const bestOneXTwoHits = oneXTwoHitTotals.reduce((max, value) => Math.max(max, value), 0);
    const bestExactScoreHits = exactScoreHitTotals.reduce((max, value) => Math.max(max, value), 0);

    const capped = (current: number, target: number): BadgeProgress => ({ current: Math.min(current, target), target });

    return {
      [BADGE_CODES.STREAK_5]: capped(bestStreak, BADGE_TARGETS.STREAK_5!),
      [BADGE_CODES.STREAK_10]: capped(bestStreak, BADGE_TARGETS.STREAK_10!),
      [BADGE_CODES.STREAK_25]: capped(bestStreak, BADGE_TARGETS.STREAK_25!),
      [BADGE_CODES.HOT_STREAK_5]: { current: bestHotStreak, target: BADGE_TARGETS.HOT_STREAK_5! },
      [BADGE_CODES.PREDICTIONS_100]: capped(bestPredictions, BADGE_TARGETS.PREDICTIONS_100!),
      [BADGE_CODES.ONE_X_TWO_HITS_25]: capped(bestOneXTwoHits, BADGE_TARGETS.ONE_X_TWO_HITS_25!),
      [BADGE_CODES.ONE_X_TWO_HITS_100]: capped(bestOneXTwoHits, BADGE_TARGETS.ONE_X_TWO_HITS_100!),
      [BADGE_CODES.EXACT_SCORE_HITS_10]: capped(bestExactScoreHits, BADGE_TARGETS.EXACT_SCORE_HITS_10!),
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
