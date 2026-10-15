import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuizService } from '../quiz/quiz.service';
import { xpProgressForLevel } from '../xp/xp.util';
import { findFavoriteTeam } from '../users/team-catalog';

/** Cuantos de los marcadores clavados se enseñan como "ultimos". */
const RECENT_EXACT_SCORES = 5;

/**
 * Perfil general de un jugador: lo que se abre al pulsar a alguien (en la clasificacion del Quiz, en Tabla...).
 * Junta, de un solo golpe, sus datos publicos y un resumen de sus grupos, del Quiz y de sus insignias.
 */
@Injectable()
export class PlayersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quiz: QuizService,
  ) {}

  async getProfile(requesterId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        avatarBackground: true,
        experience: true,
        favoriteTeam: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMe = requesterId === userId;
    const [
      scored,
      hits,
      globalStreak,
      groupsCount,
      sharedMemberships,
      userBadges,
      ranking,
      quizHits,
      quizMisses,
      scorePredictions,
    ] = await Promise.all([
      this.prisma.prediction.count({ where: { userId, pointsEarned: { not: null } } }),
      this.prisma.prediction.count({ where: { userId, pointsEarned: { gt: 0 } } }),
      this.prisma.globalStreak.findUnique({ where: { userId } }),
      this.prisma.groupMembership.count({ where: { userId } }),
      // Solo se enseñan los grupos que compartes con el jugador: la lista de grupos de alguien es suya.
      this.prisma.groupMembership.findMany({
        where: isMe
          ? { userId }
          : { userId, group: { memberships: { some: { userId: requesterId } } } },
        include: { group: { select: { id: true, name: true } } },
        orderBy: { joinedAt: 'asc' },
      }),
      this.prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      }),
      // `me` de esta clasificacion es el propio jugador: su puesto en el Quiz de la temporada actual.
      this.quiz.rankings(userId, { limit: 1 }),
      this.prisma.quizAnswer.count({
        where: {
          participation: { userId, event: { lockedAt: { not: null } } },
          question: { resolution: 'RESOLVED' },
          pointsEarned: { gt: 0 },
        },
      }),
      this.prisma.quizAnswer.count({
        where: {
          participation: { userId, event: { lockedAt: { not: null } } },
          question: { resolution: 'RESOLVED' },
          pointsEarned: 0,
        },
      }),
      // Pronosticos de marcador con el partido ya jugado: se comparan aqui (Prisma no compara columnas de dos tablas).
      this.prisma.prediction.findMany({
        where: {
          userId,
          predictedHomeScore: { not: null },
          predictedAwayScore: { not: null },
          match: { homeScore: { not: null }, awayScore: { not: null } },
        },
        select: {
          predictedHomeScore: true,
          predictedAwayScore: true,
          match: {
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              homeTeamShort: true,
              awayTeamShort: true,
              homeScore: true,
              awayScore: true,
              kickoff: true,
            },
          },
        },
        orderBy: { match: { kickoff: 'desc' } },
      }),
    ]);

    // Marcadores exactos: el pronostico coincide con el resultado. Un mismo partido en varios grupos cuenta en cada uno.
    const exact = scorePredictions.filter(
      (p) =>
        p.predictedHomeScore === p.match.homeScore && p.predictedAwayScore === p.match.awayScore,
    );
    const recentExact = [...new Map(exact.map((p) => [p.match.id, p.match])).values()]
      .slice(0, RECENT_EXACT_SCORES)
      .map((match) => ({
        matchId: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        homeTeamShort: match.homeTeamShort,
        awayTeamShort: match.awayTeamShort,
        homeScore: match.homeScore as number,
        awayScore: match.awayScore as number,
        kickoff: match.kickoff.toISOString(),
      }));

    const sharedGroups = await Promise.all(
      sharedMemberships.map(async (membership) => {
        const [groupScored, groupHits, streak] = await Promise.all([
          this.prisma.prediction.count({
            where: { userId, groupId: membership.groupId, pointsEarned: { not: null } },
          }),
          this.prisma.prediction.count({
            where: { userId, groupId: membership.groupId, pointsEarned: { gt: 0 } },
          }),
          this.prisma.streak.findUnique({
            where: { userId_groupId: { userId, groupId: membership.groupId } },
          }),
        ]);
        return {
          groupId: membership.groupId,
          name: membership.group.name,
          scored: groupScored,
          hits: groupHits,
          misses: groupScored - groupHits,
          streak: { current: streak?.currentStreak ?? 0, longest: streak?.longestStreak ?? 0 },
        };
      }),
    );

    // Una insignia ganada en varios grupos cuenta una sola vez.
    const badges = [...new Map(userBadges.map((ub) => [ub.badge.code, ub])).values()].map((ub) => ({
      code: ub.badge.code,
      name: ub.badge.name,
      description: ub.badge.description,
      earnedAt: ub.earnedAt.toISOString(),
    }));

    return {
      userId: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      avatarBackground: user.avatarBackground,
      level: xpProgressForLevel(user.experience).level,
      favoriteTeam: findFavoriteTeam(user.favoriteTeam),
      isMe,
      predictions: {
        scored,
        hits,
        misses: scored - hits,
        hitRate: scored > 0 ? hits / scored : null,
      },
      exactScores: {
        hits: exact.length,
        // Pronosticos de marcador con el partido ya jugado: el denominador de los exactos.
        played: scorePredictions.length,
        recent: recentExact,
      },
      streak: {
        current: globalStreak?.currentStreak ?? 0,
        longest: globalStreak?.longestStreak ?? 0,
      },
      groupsCount,
      sharedGroups,
      quiz: {
        seasonLabel: ranking.seasonLabel,
        // En la clasificacion salen todos; quien no ha jugado ningun quiz no tiene puesto que ensenar.
        position: ranking.me && ranking.me.quizzesPlayed > 0 ? ranking.me.position : null,
        total: ranking.total,
        points: ranking.me?.points ?? 0,
        quizzesPlayed: ranking.me?.quizzesPlayed ?? 0,
        hits: quizHits,
        misses: quizMisses,
      },
      badges,
    };
  }
}
