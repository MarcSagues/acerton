import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { xpProgressForLevel } from '../xp/xp.util';

/**
 * Cuantas jornadas recientes se devuelven en el detalle de un miembro:
 * suficiente para la vista "Histórico" dedicada sin paginar todavia (ver
 * docs/quiniela/profile-reorganization-plan.md P2/P3 para paginacion real).
 */
const RECENT_MATCHDAYS_LIMIT = 20;

@Injectable()
export class MemberProfileService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Estadisticas publicas de un miembro dentro de un grupo (racha, % de
   * aciertos, insignias ganadas en ese grupo, y sus ultimas jornadas
   * jugadas) — pensado para la pantalla de detalle de miembro. El llamador
   * debe comprobar antes que quien pregunta pertenece al grupo (ver
   * MemberProfileController): esto no expone nada fuera de ese grupo.
   */
  async getMemberProfile(groupId: string, userId: string) {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, avatarBackground: true, experience: true } },
        group: { select: { id: true, name: true, scoringMode: true, ownerId: true } },
      },
    });
    if (!membership) {
      throw new NotFoundException('Ese usuario no es miembro de este grupo');
    }

    const [streak, scoredPredictions, badges, snapshots] = await Promise.all([
      this.prisma.streak.findUnique({ where: { userId_groupId: { userId, groupId } } }),
      this.prisma.prediction.findMany({
        where: { userId, groupId, pointsEarned: { not: null } },
        select: { pointsEarned: true },
      }),
      this.prisma.userBadge.findMany({
        where: { userId, groupId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      }),
      this.prisma.rankingSnapshot.findMany({
        where: { groupId, userId, period: 'WEEKLY' },
        include: { matchday: { select: { order: true, closesAt: true, status: true, competition: { select: { name: true } } } } },
        orderBy: { matchday: { closesAt: 'desc' } },
        take: RECENT_MATCHDAYS_LIMIT,
      }),
    ]);

    const totalScored = scoredPredictions.length;
    const hits = scoredPredictions.filter((p) => (p.pointsEarned ?? 0) > 0).length;
    const hitRate = totalScored > 0 ? hits / totalScored : null;

    return {
      userId: membership.userId,
      name: membership.user.name,
      avatarUrl: membership.user.avatarUrl,
      avatarBackground: membership.user.avatarBackground,
      level: xpProgressForLevel(membership.user.experience).level,
      role: membership.role,
      joinedAt: membership.joinedAt,
      isOwner: membership.group.ownerId === membership.userId,
      group: {
        id: membership.group.id,
        name: membership.group.name,
        scoringMode: membership.group.scoringMode,
      },
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
      },
      hitRate,
      /** Predicciones puntuadas (denominador de hitRate), no jornadas: varios partidos por jornada cuentan por separado. */
      scoredPredictionsCount: totalScored,
      badges: badges.map((ub) => ({
        id: ub.id,
        earnedAt: ub.earnedAt,
        badge: { id: ub.badge.id, code: ub.badge.code, name: ub.badge.name, description: ub.badge.description },
      })),
      recentMatchdays: snapshots.map((s) => ({
        matchdayId: s.matchdayId,
        order: s.matchday.order,
        closesAt: s.matchday.closesAt,
        points: s.points,
        position: s.position,
        competitionName: s.matchday.competition.name,
        status: s.matchday.status,
      })),
    };
  }
}
