import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeNextStreak } from './streak-calculator';

@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getForUserInGroup(userId: string, groupId: string) {
    const streak = await this.prisma.streak.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return streak ?? { userId, groupId, currentStreak: 0, longestStreak: 0, lastMatchdayId: null };
  }

  getAllForGroup(groupId: string) {
    return this.prisma.streak.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { currentStreak: 'desc' },
    });
  }

  /**
   * Al cerrar una jornada de una competicion, actualiza la racha de cada
   * miembro de cada grupo que tenga esa competicion activa. Idempotente:
   * si un grupo+usuario ya fue procesado para esta jornada (lastMatchdayId
   * coincide) se salta, para poder relanzar el job sin duplicar efectos.
   */
  async updateAfterMatchdayClose(matchdayId: string): Promise<void> {
    const matchday = await this.prisma.matchday.findUnique({
      where: { id: matchdayId },
      include: {
        competition: { include: { groupCompetitions: { where: { isActive: true } } } },
      },
    });
    if (!matchday) {
      return;
    }

    const groupIds = matchday.competition.groupCompetitions.map((gc) => gc.groupId);
    if (groupIds.length === 0) {
      return;
    }

    for (const groupId of groupIds) {
      await this.updateGroupStreaks(groupId, matchdayId);
    }
  }

  private async updateGroupStreaks(groupId: string, matchdayId: string): Promise<void> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const participantRows = await this.prisma.prediction.findMany({
      where: { groupId, match: { matchdayId } },
      select: { userId: true },
      distinct: ['userId'],
    });
    const participants = new Set(participantRows.map((p) => p.userId));

    for (const { userId } of members) {
      const existing = await this.prisma.streak.findUnique({
        where: { userId_groupId: { userId, groupId } },
      });

      if (existing?.lastMatchdayId === matchdayId) {
        continue; // ya procesado, evita doble conteo si el job se relanza
      }

      const next = computeNextStreak(
        {
          currentStreak: existing?.currentStreak ?? 0,
          longestStreak: existing?.longestStreak ?? 0,
        },
        participants.has(userId),
      );

      await this.prisma.streak.upsert({
        where: { userId_groupId: { userId, groupId } },
        update: { ...next, lastMatchdayId: matchdayId },
        create: { userId, groupId, ...next, lastMatchdayId: matchdayId },
      });
    }

    this.logger.log(`Rachas actualizadas para grupo ${groupId}, jornada ${matchdayId}`);
  }
}
