import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RankingsService } from '../rankings/rankings.service';

export interface ComebackStatus {
  enabled: boolean;
  pointsPerBonus: number;
  /** Diferencia de puntos con el lider del scope que corresponda (0 si vas primero o empatado). */
  gap: number;
  /** Usos disponibles esta jornada segun el gap actual, mas el extra de AdRewardClaim si lo tiene. */
  allowance: number;
  /** Usos ya gastados en la jornada consultada (0 si no se paso matchdayId). */
  used: number;
  remaining: number;
  /** Ya tiene el comodin extra de esta jornada conseguido viendo un video (ver AdRewardClaim). Siempre false sin matchdayId. */
  adBonusClaimed: boolean;
  /** Podria conseguir ese comodin extra ahora mismo (activado en el grupo, jornada aun no finalizada, todavia no reclamado). Siempre false sin matchdayId. */
  adBonusAvailable: boolean;
}

type PrismaOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class WildcardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingsService: RankingsService,
  ) {}

  /**
   * Estado del comodin de remontada para un usuario en un grupo. La cantidad
   * de usos disponibles se recalcula en caliente cada vez (no se guarda en
   * BBDD): depende de cuanto vas por detras del lider ahora mismo, asi que
   * cambia semana a semana segun la clasificacion.
   *
   * `matchdayId` es opcional: sin el, `used`/`remaining` no tienen sentido
   * (no hay una jornada concreta de la que contar usos) y se devuelve
   * `remaining = allowance`. Con el, se cuentan las predicciones de esa
   * jornada que ya usan doubleChanceOption.
   *
   * `excludeMatchId` se usa al validar el envio de una prediccion: si el
   * usuario ya tenia ese partido en remontada y solo cambia la combinacion
   * (1X/X2/12), no debe contar como un uso nuevo.
   */
  async getComebackStatus(
    userId: string,
    groupId: string,
    matchdayId?: string,
    excludeMatchId?: string,
    client: PrismaOrTx = this.prisma,
  ): Promise<ComebackStatus> {
    const group = await client.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    const gap = await this.getGapToLeader(userId, groupId);
    const baseAllowance = group.comebackEnabled
      ? Math.floor(gap / group.comebackPointsPerBonus)
      : 0;

    const [used, adClaim, matchday] = await Promise.all([
      matchdayId
        ? client.prediction.count({
            where: {
              userId,
              groupId,
              match: { matchdayId },
              ...(group.scoringMode === 'EXACT_SCORE'
                ? { doublePointsWildcard: true }
                : { doubleChanceOption: { not: null } }),
              ...(excludeMatchId ? { matchId: { not: excludeMatchId } } : {}),
            },
          })
        : Promise.resolve(0),
      matchdayId
        ? client.adRewardClaim.findUnique({ where: { userId_groupId_matchdayId: { userId, groupId, matchdayId } } })
        : Promise.resolve(null),
      matchdayId ? client.matchday.findUnique({ where: { id: matchdayId } }) : Promise.resolve(null),
    ]);

    const adBonusClaimed = !!adClaim;
    const adBonusAvailable =
      !!matchdayId && group.comebackEnabled && !adBonusClaimed && matchday?.status !== 'FINISHED';
    const allowance = baseAllowance + (adBonusClaimed ? 1 : 0);

    return {
      enabled: group.comebackEnabled,
      pointsPerBonus: group.comebackPointsPerBonus,
      gap,
      allowance,
      used,
      remaining: Math.max(allowance - used, 0),
      adBonusClaimed,
      adBonusAvailable,
    };
  }

  /**
   * Concede el comodin extra de esta jornada tras ver un video de anuncio
   * (AdMob rewarded). Idempotente: si ya estaba reclamado (doble tap tras
   * ver el video, red lenta reintentando...) no lanza, simplemente devuelve
   * el estado actual sin duplicar el comodin.
   */
  async claimAdReward(userId: string, groupId: string, matchdayId: string): Promise<ComebackStatus> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    if (!group.comebackEnabled) {
      throw new ForbiddenException('El comodín de remontada está desactivado en este grupo');
    }

    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday || matchday.status === 'FINISHED') {
      throw new ForbiddenException('Esta jornada ya no admite comodines nuevos');
    }
    const activeInGroup = await this.prisma.groupCompetition.findFirst({
      where: { groupId, competitionId: matchday.competitionId, isActive: true },
    });
    if (!activeInGroup) {
      throw new ForbiddenException('Esa jornada no pertenece a una competición activa de este grupo');
    }

    try {
      await this.prisma.adRewardClaim.create({ data: { userId, groupId, matchdayId } });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        throw error;
      }
    }

    return this.getComebackStatus(userId, groupId, matchdayId);
  }

  /**
   * Diferencia de puntos entre el usuario y el lider del scope que
   * corresponda: general combinado si el grupo tiene mas de una competicion
   * activa, o la unica competicion activa si solo tiene una. 0 si todavia no
   * hay clasificacion (temporada recien empezada), no hay competiciones
   * activas, o el usuario va primero.
   */
  private async getGapToLeader(userId: string, groupId: string): Promise<number> {
    const activeCompetitions = await this.prisma.groupCompetition.findMany({
      where: { groupId, isActive: true },
      select: { competitionId: true },
    });
    if (activeCompetitions.length === 0) {
      return 0;
    }

    const scope = activeCompetitions.length > 1 ? null : activeCompetitions[0].competitionId;
    const rows = await this.rankingsService.getLatestRanking(groupId, 'TOTAL', scope);
    if (rows.length === 0) {
      return 0;
    }

    const leaderPoints = rows[0].points;
    const myPoints = rows.find((row) => row.userId === userId)?.points ?? 0;
    return Math.max(leaderPoints - myPoints, 0);
  }

  /** Lanza si el usuario no tiene comodines de remontada disponibles para ese partido/jornada. */
  async assertCanUseDoubleChance(
    userId: string,
    groupId: string,
    matchdayId: string,
    matchId: string,
    client: PrismaOrTx = this.prisma,
  ): Promise<void> {
    const status = await this.getComebackStatus(userId, groupId, matchdayId, matchId, client);
    if (!status.enabled) {
      throw new ForbiddenException('El comodín de remontada está desactivado en este grupo');
    }
    if (status.remaining <= 0) {
      throw new ForbiddenException(
        'No te quedan comodines de remontada disponibles esta jornada',
      );
    }
  }
}
