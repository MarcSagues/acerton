import { Injectable, Logger } from '@nestjs/common';
import { RankingPeriod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { rankEntries, ScoredEntry } from './rank-entries.util';

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recalcula clasificaciones tras puntuar una jornada: semanal y total de
   * la competicion de esa jornada, y total general combinado para los
   * grupos que tengan mas de una competicion activa. La semanal "general"
   * no se calcula: al ser competiciones con calendarios independientes, no
   * existe una nocion de "misma jornada" compartida entre ellas.
   *
   * No exige que la jornada haya terminado del todo pese al nombre: JobsService
   * tambien la llama para jornadas cerradas con solo parte de sus partidos
   * decididos (puntuacion/clasificacion "en vivo"), reutilizando el mismo
   * calculo — solo suma el pointsEarned que ya haya en cada prediccion, que
   * PredictionsService.scoreFinishedMatchday ya deja en null para los
   * partidos todavia sin terminar.
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

  /**
   * Ultima foto de clasificacion disponible para un scope (semanal = ultima
   * jornada; total = mas reciente acumulada), con `positionDelta` (positivo
   * = ha subido, negativo = ha bajado, 0 = igual) respecto a la foto anterior
   * de ese mismo scope. Si no hay foto anterior (primera jornada jugada) se
   * compara contra la posicion 1 para todos: antes de jugarse nada todo el
   * mundo esta a 0 puntos, osea empatado en la misma posicion.
   */
  async getLatestRanking(groupId: string, period: RankingPeriod, competitionId: string | null) {
    const latest = await this.prisma.rankingSnapshot.findFirst({
      where: { groupId, period, competitionId },
      orderBy: { createdAt: 'desc' },
    });
    if (!latest) {
      return this.emptyRanking(groupId, period, competitionId);
    }

    const [current, previousSnapshot] = await Promise.all([
      this.prisma.rankingSnapshot.findMany({
        where: { groupId, period, competitionId, matchdayId: latest.matchdayId },
        orderBy: { position: 'asc' },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      }),
      this.prisma.rankingSnapshot.findFirst({
        where: { groupId, period, competitionId, matchdayId: { not: latest.matchdayId } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const previousRows = previousSnapshot
      ? await this.prisma.rankingSnapshot.findMany({
          where: { groupId, period, competitionId, matchdayId: previousSnapshot.matchdayId },
        })
      : [];
    const previousPositionByUser = new Map(previousRows.map((row) => [row.userId, row.position]));

    return current.map((row) => ({
      ...row,
      positionDelta: (previousPositionByUser.get(row.userId) ?? 1) - row.position,
    }));
  }

  /**
   * Antes de que se finalice ninguna jornada no existe ninguna fila de
   * RankingSnapshot todavia, pero el grupo si tiene miembros — se listan
   * todos empatados a 0 puntos en vez de dejar la tabla vacia.
   */
  private async emptyRanking(groupId: string, period: RankingPeriod, competitionId: string | null) {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    const ranked = rankEntries(members.map((m) => ({ userId: m.userId, points: 0 })));
    return ranked.map((entry) => ({
      id: `empty-${entry.userId}`,
      groupId,
      competitionId,
      matchdayId: '',
      period,
      userId: entry.userId,
      points: entry.points,
      position: entry.position,
      positionDelta: 0,
      createdAt: new Date(),
      user: members.find((m) => m.userId === entry.userId)!.user,
    }));
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
