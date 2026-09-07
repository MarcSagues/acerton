import { Injectable, Logger } from '@nestjs/common';
import { RankingPeriod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rankEntries, ScoredEntry } from './rank-entries.util';

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcula clasificaciones tras finalizar y puntuar una jornada: semanal
   * y total de la competicion de esa jornada, y total general combinado
   * para los grupos que tengan mas de una competicion activa. La semanal
   * "general" no se calcula: al ser competiciones con calendarios
   * independientes, no existe una nocion de "misma jornada" compartida
   * entre ellas.
   */
  async computeForFinishedMatchday(matchdayId: string): Promise<void> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      return;
    }

    const groupCompetitions = await this.prisma.groupCompetition.findMany({
      where: { competitionId: matchday.competitionId, isActive: true },
    });

    for (const gc of groupCompetitions) {
      await this.computeWeekly(gc.groupId, matchday.competitionId, matchdayId);
      await this.computeCompetitionTotal(gc.groupId, matchday.competitionId, matchdayId);

      const activeCount = await this.prisma.groupCompetition.count({
        where: { groupId: gc.groupId, isActive: true },
      });
      if (activeCount > 1) {
        await this.computeGeneralTotal(gc.groupId, matchdayId);
      }
    }

    this.logger.log(`Clasificaciones recalculadas para jornada ${matchdayId}`);
  }

  private async computeWeekly(
    groupId: string,
    competitionId: string,
    matchdayId: string,
  ): Promise<void> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const predictions = await this.prisma.prediction.findMany({
      where: { groupId, match: { matchdayId } },
      select: { userId: true, pointsEarned: true },
    });

    const entries = this.sumByUser(
      members.map((m) => m.userId),
      predictions,
    );
    await this.persist(groupId, competitionId, matchdayId, 'WEEKLY', entries);
  }

  private async computeCompetitionTotal(
    groupId: string,
    competitionId: string,
    matchdayId: string,
  ): Promise<void> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const predictions = await this.prisma.prediction.findMany({
      where: { groupId, match: { matchday: { competitionId } } },
      select: { userId: true, pointsEarned: true },
    });

    const entries = this.sumByUser(
      members.map((m) => m.userId),
      predictions,
    );
    await this.persist(groupId, competitionId, matchdayId, 'TOTAL', entries);
  }

  private async computeGeneralTotal(groupId: string, matchdayId: string): Promise<void> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const predictions = await this.prisma.prediction.findMany({
      where: { groupId },
      select: { userId: true, pointsEarned: true },
    });

    const entries = this.sumByUser(
      members.map((m) => m.userId),
      predictions,
    );
    await this.persist(groupId, null, matchdayId, 'TOTAL', entries);
  }

  private sumByUser(
    memberIds: string[],
    predictions: { userId: string; pointsEarned: number | null }[],
  ): ScoredEntry[] {
    const totals = new Map<string, number>(memberIds.map((id) => [id, 0]));
    for (const prediction of predictions) {
      totals.set(
        prediction.userId,
        (totals.get(prediction.userId) ?? 0) + (prediction.pointsEarned ?? 0),
      );
    }
    return [...totals.entries()].map(([userId, points]) => ({ userId, points }));
  }

  /**
   * Nota: competitionId es nullable (null = ranking general combinado) y
   * Postgres no deduplica NULLs bajo una unique constraint compuesta, asi
   * que en vez de upsert por la clave compuesta se borra y se recrea el
   * set completo de filas para ese (groupId, competitionId, matchdayId,
   * period) en una transaccion. Idempotente y evita duplicados con null.
   */
  private async persist(
    groupId: string,
    competitionId: string | null,
    matchdayId: string,
    period: RankingPeriod,
    entries: ScoredEntry[],
  ): Promise<void> {
    const ranked = rankEntries(entries);
    await this.prisma.$transaction([
      this.prisma.rankingSnapshot.deleteMany({
        where: { groupId, competitionId, matchdayId, period },
      }),
      this.prisma.rankingSnapshot.createMany({
        data: ranked.map((entry) => ({
          groupId,
          competitionId,
          matchdayId,
          period,
          userId: entry.userId,
          points: entry.points,
          position: entry.position,
        })),
      }),
    ]);
  }

  /** Ultima foto de clasificacion disponible para un scope (semanal = ultima jornada; total = mas reciente acumulada). */
  async getLatestRanking(groupId: string, period: RankingPeriod, competitionId: string | null) {
    const latest = await this.prisma.rankingSnapshot.findFirst({
      where: { groupId, period, competitionId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) {
      return [];
    }

    return this.prisma.rankingSnapshot.findMany({
      where: { groupId, period, competitionId, matchdayId: latest.matchdayId },
      orderBy: { position: 'asc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }

  async getRankingForMatchday(
    groupId: string,
    period: RankingPeriod,
    competitionId: string | null,
    matchdayId: string,
  ) {
    return this.prisma.rankingSnapshot.findMany({
      where: { groupId, period, competitionId, matchdayId },
      orderBy: { position: 'asc' },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
  }
}
