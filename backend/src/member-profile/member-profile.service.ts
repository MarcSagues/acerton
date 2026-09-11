import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Cuantas jornadas recientes se devuelven en el detalle de un miembro. */
const RECENT_MATCHDAYS_LIMIT = 5;

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
      include: { user: { select: { id: true, name: true } } },
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
        include: { matchday: { select: { order: true, closesAt: true } } },
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
      role: membership.role,
      joinedAt: membership.joinedAt,
      streak: {
        currentStreak: streak?.currentStreak ?? 0,
        longestStreak: streak?.longestStreak ?? 0,
      },
      hitRate,
      badges: badges.map((ub) => ({
        id: ub.id,
        earnedAt: ub.earnedAt,
        badge: { id: ub.badge.id, code: ub.badge.code, name: ub.badge.name, description: ub.badge.description },
      })),
      recentMatchdays: snapshots.map((s) => ({
        matchdayId: s.matchdayId,
        order: s.matchday.order,
        points: s.points,
        position: s.position,
      })),
    };
  }
}
