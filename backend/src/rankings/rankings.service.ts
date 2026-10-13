import { Injectable, Logger } from '@nestjs/common';
import { Prisma, RankingPeriod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SeasonsService } from '../seasons/seasons.service';
import { rankEntries, ScoredEntry } from './rank-entries.util';
import { xpProgressForLevel } from '../xp/xp.util';

const RANKING_USER_SELECT = {
  id: true,
  name: true,
  avatarUrl: true,
  avatarBackground: true,
  experience: true,
} as const;

function withLevel<T extends { user: { experience: number } }>(
  row: T,
): T & { user: T['user'] & { level: number } } {
  return { ...row, user: { ...row.user, level: xpProgressForLevel(row.user.experience).level } };
}

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonsService: SeasonsService,
  ) {}

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
    const groupSeason = await this.seasonsService.getOpenSeason(groupId);
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
          groupSeasonId: groupSeason.id,
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
        include: { user: { select: RANKING_USER_SELECT } },
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

    return current.map((row) =>
      withLevel({
        ...row,
        positionDelta: (previousPositionByUser.get(row.userId) ?? 1) - row.position,
      }),
    );
  }

  /**
   * Antes de que se finalice ninguna jornada no existe ninguna fila de
   * RankingSnapshot todavia, pero el grupo si tiene miembros — se listan
   * todos empatados a 0 puntos en vez de dejar la tabla vacia.
   */
  private async emptyRanking(groupId: string, period: RankingPeriod, competitionId: string | null) {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: RANKING_USER_SELECT } },
    });

    const ranked = rankEntries(members.map((m) => ({ userId: m.userId, points: 0 })));
    return ranked.map((entry) =>
      withLevel({
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
      }),
    );
  }

  /**
   * Existe alguna fila calculada para este scope, sin traerla entera —
   * usado por la vista previa de grupos publicos para decidir si mostrar
   * un top real o el estado vacio (ver PublicGroupPreviewService).
   */
  async hasRanking(
    groupId: string,
    period: RankingPeriod,
    competitionId: string | null,
  ): Promise<boolean> {
    const snapshot = await this.prisma.rankingSnapshot.findFirst({
      where: { groupId, period, competitionId },
      select: { id: true },
    });
    return snapshot !== null;
  }

  /**
   * Clasificacion de una jornada concreta. Quien no tiene fila en esa jornada
   * (el grupo no la jugo —se creo despues o nadie pronostico— o el jugador
   * entro despues) cuenta con 0 puntos: nunca se devuelve una tabla vacia ni
   * se esconde a nadie del grupo.
   */
  async getRankingForMatchday(
    groupId: string,
    period: RankingPeriod,
    competitionId: string | null,
    matchdayId: string,
  ) {
    const [rows, members] = await Promise.all([
      this.prisma.rankingSnapshot.findMany({
        where: { groupId, period, competitionId, matchdayId },
        orderBy: { position: 'asc' },
        include: { user: { select: RANKING_USER_SELECT } },
      }),
      this.prisma.groupMembership.findMany({
        where: { groupId },
        include: { user: { select: RANKING_USER_SELECT } },
      }),
    ]);

    const scored = new Set(rows.map((row) => row.userId));
    const absent = members.filter((member) => !scored.has(member.userId));
    if (absent.length === 0) {
      return rows.map((row) => withLevel({ ...row, positionDelta: 0 }));
    }

    const zeroRows = absent.map((member) => ({
      id: `empty-${member.userId}`,
      groupId,
      competitionId,
      matchdayId,
      period,
      userId: member.userId,
      points: 0,
      createdAt: new Date(),
      user: member.user,
    }));
    const positionByUser = new Map(
      rankEntries(
        [...rows, ...zeroRows].map((row) => ({ userId: row.userId, points: row.points })),
      ).map((entry) => [entry.userId, entry.position]),
    );
    return [...rows, ...zeroRows]
      .map((row) =>
        withLevel({ ...row, position: positionByUser.get(row.userId) ?? 0, positionDelta: 0 }),
      )
      .sort((a, b) => a.position - b.position);
  }

  /**
   * Historico de jornadas ya finalizadas de una competicion dentro de un
   * grupo: quien gano cada una, cuantos puntos hizo el usuario que pide el
   * historico y cuantos hizo cada jugador (`scores`, para la grafica de
   * lineas de Tabla), mas la media de puntos por jornada del grupo y la suya
   * propia. Reutiliza los RankingSnapshot semanales ya calculados al cerrar
   * cada jornada (computeWeekly) — no hace falta volver a sumar nada de
   * Prediction.
   */
  async getHistoryForCompetition(groupId: string, competitionId: string, userId: string) {
    const finishedMatchdays = await this.prisma.matchday.findMany({
      where: { competitionId, status: 'FINISHED' },
      orderBy: { order: 'desc' },
    });
    if (finishedMatchdays.length === 0) {
      return { matchdays: [], groupAverage: null, userAverage: null };
    }

    const matchdayIds = finishedMatchdays.map((m) => m.id);
    const snapshots = await this.prisma.rankingSnapshot.findMany({
      where: { groupId, competitionId, matchdayId: { in: matchdayIds }, period: 'WEEKLY' },
      include: { user: { select: { id: true, name: true } } },
    });

    const byMatchday = new Map<string, typeof snapshots>();
    for (const snapshot of snapshots) {
      const entries = byMatchday.get(snapshot.matchdayId) ?? [];
      entries.push(snapshot);
      byMatchday.set(snapshot.matchdayId, entries);
    }

    const matchdays = finishedMatchdays.map((matchday) => {
      const entries = byMatchday.get(matchday.id) ?? [];
      const winner = entries.reduce<(typeof entries)[number] | null>(
        (best, entry) => (!best || entry.points > best.points ? entry : best),
        null,
      );
      const mine = entries.find((entry) => entry.userId === userId);
      return {
        matchdayId: matchday.id,
        order: matchday.order,
        // Fecha de la jornada (primer partido): ordena las jornadas de varias ligas en la grafica de "General".
        closesAt: matchday.closesAt.toISOString(),
        winner: winner
          ? { userId: winner.userId, name: winner.user.name, points: winner.points }
          : null,
        myPoints: mine ? mine.points : null,
        scores: entries.map((entry) => ({
          userId: entry.userId,
          name: entry.user.name,
          points: entry.points,
        })),
      };
    });

    const allPoints = snapshots.map((snapshot) => snapshot.points);
    const groupAverage = allPoints.length ? average(allPoints) : null;
    const myPoints = snapshots
      .filter((snapshot) => snapshot.userId === userId)
      .map((snapshot) => snapshot.points);
    const userAverage = myPoints.length ? average(myPoints) : null;

    return { matchdays, groupAverage, userAverage };
  }

  /**
   * "Rey del marcador exacto": cuantos marcadores exactos ha clavado cada
   * miembro del grupo, solo en grupos de modo resultado exacto (en los de 1X2
   * devuelve una lista vacia). Mismo alcance que la clasificacion que se esta
   * viendo: en semanal, los partidos de la jornada pedida (o de la ultima con
   * clasificacion semanal, la misma que enseña getLatestRanking); en total, los
   * de la competicion o, en "general", todos los del grupo. Solo cuentan los
   * partidos terminados, igual que los puntos. Quien no ha clavado ninguno sale
   * con 0; los empates comparten puesto (rankEntries).
   *
   * Prisma no compara una columna con la de otra tabla en un `where`, asi que
   * se traen los marcadores y se comparan aqui (mismo patron que
   * BadgesService.countExactScoreHits).
   */
  async getExactScoreLeaders(
    groupId: string,
    period: RankingPeriod,
    competitionId: string | null,
    matchdayId?: string,
  ) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { scoringMode: true },
    });
    if (group?.scoringMode !== 'EXACT_SCORE') {
      return [];
    }

    let matchFilter: Prisma.MatchWhereInput;
    if (period === 'WEEKLY') {
      // La semanal general no existe: cada competicion tiene su calendario.
      if (!competitionId) {
        return [];
      }
      const targetMatchdayId =
        matchdayId ??
        (
          await this.prisma.rankingSnapshot.findFirst({
            where: { groupId, period: 'WEEKLY', competitionId },
            orderBy: { createdAt: 'desc' },
            select: { matchdayId: true },
          })
        )?.matchdayId;
      if (!targetMatchdayId) {
        return [];
      }
      matchFilter = { matchdayId: targetMatchdayId, status: 'FINISHED' };
    } else {
      matchFilter = competitionId
        ? { status: 'FINISHED', matchday: { competitionId } }
        : { status: 'FINISHED' };
    }

    const [predictions, members] = await Promise.all([
      this.prisma.prediction.findMany({
        where: {
          groupId,
          predictedHomeScore: { not: null },
          predictedAwayScore: { not: null },
          match: matchFilter,
        },
        select: {
          userId: true,
          predictedHomeScore: true,
          predictedAwayScore: true,
          match: { select: { homeScore: true, awayScore: true } },
        },
      }),
      this.prisma.groupMembership.findMany({
        where: { groupId },
        include: { user: { select: RANKING_USER_SELECT } },
      }),
    ]);

    const hitsByUser = new Map<string, number>(members.map((m) => [m.userId, 0]));
    for (const p of predictions) {
      const exact =
        p.match.homeScore != null &&
        p.match.awayScore != null &&
        p.predictedHomeScore === p.match.homeScore &&
        p.predictedAwayScore === p.match.awayScore;
      if (exact && hitsByUser.has(p.userId)) {
        hitsByUser.set(p.userId, hitsByUser.get(p.userId)! + 1);
      }
    }

    const userById = new Map(members.map((m) => [m.userId, m.user]));
    return rankEntries(
      [...hitsByUser.entries()].map(([userId, points]) => ({ userId, points })),
    ).map((entry) =>
      withLevel({
        userId: entry.userId,
        position: entry.position,
        exactHits: entry.points,
        user: userById.get(entry.userId)!,
      }),
    );
  }
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
