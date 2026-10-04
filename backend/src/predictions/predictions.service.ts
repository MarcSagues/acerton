import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prediction, ScoringMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WildcardsService } from '../wildcards/wildcards.service';
import { GroupsService } from '../groups/groups.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { XpService } from '../xp/xp.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitPredictionDto } from './dto/submit-prediction.dto';
import { calculateExactScorePoints, calculatePoints } from './scoring.util';
import { isMatchPredictable } from '../matchdays/matchday.util';
import { xpProgressForLevel } from '../xp/xp.util';
import { CopySkipReason, canCopyBetweenModes, planCopy } from './copy-predictions.util';

/** Otro grupo del usuario del que se pueden copiar pronosticos (ver PredictionsService.getCopySources). */
export interface CopySource {
  groupId: string;
  name: string;
  scoringMode: ScoringMode;
  /** Cuantos de sus pronosticos de esa jornada siguen abiertos (los que ya empezaron no se copian). */
  copyableCount: number;
  /** false si no se puede convertir (de un grupo 1X2 a uno de resultado exacto, no hay marcador que copiar). */
  compatible: boolean;
}

export interface CopyResult {
  /** Pronosticos ya guardados en el grupo de destino. */
  copied: Prediction[];
  skipped: { matchId: string; reason: CopySkipReason }[];
  /** Partidos copiados SIN el comodin que tenian (no disponible en el destino, o sin equivalente en su modo). */
  wildcardsDropped: string[];
}

@Injectable()
export class PredictionsService {
  private readonly logger = new Logger(PredictionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wildcardsService: WildcardsService,
    private readonly groupsService: GroupsService,
    private readonly matchdaysService: MatchdaysService,
    private readonly xpService: XpService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async submit(userId: string, groupId: string, dto: SubmitPredictionDto): Promise<Prediction> {
    await this.groupsService.assertIsMember(groupId, userId);
    const scoringMode = await this.groupsService.getScoringMode(groupId);

    const match = await this.prisma.match.findUnique({ where: { id: dto.matchId } });
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }
    if (!isMatchPredictable(match, new Date())) {
      throw new ForbiddenException('Este partido ya ha empezado, no se admiten más predicciones');
    }
    if (!(await this.matchdaysService.canAcceptPredictions(match.matchdayId))) {
      throw new ForbiddenException(
        'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual',
      );
    }

    /** Es primera vez que este usuario pronostica este partido (ver awardParticipationXp abajo): comprobado ahora, antes del upsert, para no confundir "primer pronostico" con "lo acabo de cambiar". */
    const isFirstPick =
      (await this.prisma.prediction.findUnique({
        where: { userId_groupId_matchId: { userId, groupId, matchId: dto.matchId } },
        select: { id: true },
      })) === null;

    let prediction: Prediction;

    if (scoringMode === 'EXACT_SCORE') {
      if (dto.choice || dto.doubleChanceOption) {
        throw new BadRequestException(
          'Este grupo juega en modo resultado exacto, no admite pronóstico 1X2',
        );
      }
      if (dto.predictedHomeScore === undefined || dto.predictedAwayScore === undefined) {
        throw new BadRequestException('Falta el resultado exacto (goles local y visitante)');
      }

      const doublePointsWildcard = dto.doublePointsWildcard ?? false;
      if (doublePointsWildcard) {
        await this.wildcardsService.assertCanUseDoubleChance(
          userId,
          groupId,
          match.matchdayId,
          dto.matchId,
        );
      }

      prediction = await this.prisma.prediction.upsert({
        where: { userId_groupId_matchId: { userId, groupId, matchId: dto.matchId } },
        update: {
          predictedHomeScore: dto.predictedHomeScore,
          predictedAwayScore: dto.predictedAwayScore,
          doublePointsWildcard,
          choice: null,
          doubleChanceOption: null,
        },
        create: {
          userId,
          groupId,
          matchId: dto.matchId,
          predictedHomeScore: dto.predictedHomeScore,
          predictedAwayScore: dto.predictedAwayScore,
          doublePointsWildcard,
        },
      });
    } else {
      if (dto.predictedHomeScore !== undefined || dto.predictedAwayScore !== undefined) {
        throw new BadRequestException('Este grupo juega en modo 1X2, no admite resultado exacto');
      }

      const isDoubleChance = !!dto.doubleChanceOption;
      if (!isDoubleChance && !dto.choice) {
        throw new BadRequestException('Falta el pronóstico 1X2');
      }

      if (isDoubleChance) {
        await this.wildcardsService.assertCanUseDoubleChance(
          userId,
          groupId,
          match.matchdayId,
          dto.matchId,
        );
      }

      const choice = isDoubleChance ? null : (dto.choice ?? null);
      const doubleChanceOption = isDoubleChance ? (dto.doubleChanceOption ?? null) : null;

      prediction = await this.prisma.prediction.upsert({
        where: { userId_groupId_matchId: { userId, groupId, matchId: dto.matchId } },
        update: { choice, doubleChanceOption },
        create: { userId, groupId, matchId: dto.matchId, choice, doubleChanceOption },
      });
    }

    if (isFirstPick) {
      await this.awardParticipationXp(userId, groupId, match.matchdayId);
    }

    return prediction;
  }

  /**
   * XP de participar en tiempo real (a peticion explicita del usuario: la
   * barra de nivel debe notarse nada mas pronosticar un partido, no solo
   * al cerrar la jornada — ver XpService.awardParticipation). Envuelto en
   * try/catch a proposito: esto es secundario al pronostico en si, un
   * fallo aqui (DB, push) no debe impedir que se guarde la prediccion.
   */
  private async awardParticipationXp(
    userId: string,
    groupId: string,
    matchdayId: string,
  ): Promise<void> {
    try {
      const levelUp = await this.xpService.awardParticipation(userId, groupId, matchdayId);
      if (levelUp) {
        await this.notificationsService.notifyLevelUp(levelUp.userId, levelUp.level);
      }
    } catch (error) {
      this.logger.warn(`No se pudo conceder XP de participacion a ${userId}: ${error}`);
    }
  }

  /**
   * Otros grupos del usuario con pronosticos suyos todavia abiertos en esa
   * jornada, para ofrecer "copiar de otro grupo". Solo grupos de los que
   * sigue siendo miembro y que no estan eliminados (salir conserva los
   * resultados, pero no es "otro grupo" al que pertenezca).
   */
  async getCopySources(userId: string, groupId: string, matchdayId: string): Promise<CopySource[]> {
    await this.groupsService.assertIsMember(groupId, userId);
    const matchday = await this.getMatchdayInActiveCompetition(groupId, matchdayId);
    const targetMode = await this.groupsService.getScoringMode(groupId);

    const predictions = await this.prisma.prediction.findMany({
      where: {
        userId,
        groupId: { not: groupId },
        match: { matchdayId: matchday.id },
        group: { deletedAt: null, memberships: { some: { userId } } },
      },
      select: {
        groupId: true,
        match: { select: { status: true, kickoff: true } },
        group: { select: { name: true, scoringMode: true } },
      },
    });

    const now = new Date();
    const sources = new Map<string, CopySource>();
    for (const prediction of predictions) {
      if (!isMatchPredictable(prediction.match, now)) continue;
      const existing = sources.get(prediction.groupId);
      if (existing) {
        existing.copyableCount += 1;
      } else {
        sources.set(prediction.groupId, {
          groupId: prediction.groupId,
          name: prediction.group.name,
          scoringMode: prediction.group.scoringMode,
          copyableCount: 1,
          compatible: canCopyBetweenModes(prediction.group.scoringMode, targetMode),
        });
      }
    }
    return [...sources.values()].sort(
      (a, b) => b.copyableCount - a.copyableCount || a.name.localeCompare(b.name),
    );
  }

  /**
   * Copia a `targetGroupId` los pronosticos que el usuario ya hizo en
   * `sourceGroupId` para una jornada ("no tener que ponerlo todo de nuevo
   * en cada grupo"). Reutiliza submit() partido a partido, asi que se aplican
   * exactamente las mismas reglas que al pronosticar a mano (partido aun no
   * empezado, jornada abierta, comodines de ESE grupo, XP de participar) y
   * un pronostico copiado se puede cambiar despues como cualquier otro.
   *
   * Sobrescribe lo que el destino ya tuviera de esos partidos, pero no toca
   * los partidos que el origen no tiene pronosticados. No es atomico: si un
   * partido falla, los demas siguen y se informa en `skipped`. Ver
   * planCopy para como se tratan los comodines y los modos de puntuacion.
   */
  async copyFromGroup(
    userId: string,
    targetGroupId: string,
    sourceGroupId: string,
    matchdayId: string,
  ): Promise<CopyResult> {
    if (targetGroupId === sourceGroupId) {
      throw new BadRequestException('Elige un grupo distinto del actual');
    }
    await Promise.all([
      this.groupsService.assertIsMember(targetGroupId, userId),
      this.groupsService.assertIsMember(sourceGroupId, userId),
    ]);
    const matchday = await this.getMatchdayInActiveCompetition(targetGroupId, matchdayId);
    if (!(await this.matchdaysService.canAcceptPredictions(matchday.id))) {
      throw new ForbiddenException(
        'Todavía no se puede predecir esta jornada, espera a que sea la jornada actual',
      );
    }

    const sourceGroup = await this.prisma.group.findFirst({
      where: { id: sourceGroupId, deletedAt: null },
      select: { scoringMode: true },
    });
    if (!sourceGroup) {
      throw new NotFoundException('Grupo no encontrado');
    }
    const sourceMode = sourceGroup.scoringMode;
    const targetMode = await this.groupsService.getScoringMode(targetGroupId);
    if (!canCopyBetweenModes(sourceMode, targetMode)) {
      throw new BadRequestException(
        'No se puede copiar de un grupo 1X2 a uno de resultado exacto: no hay marcador que copiar',
      );
    }

    const sourcePredictions = await this.prisma.prediction.findMany({
      where: { userId, groupId: sourceGroupId, match: { matchdayId: matchday.id } },
      include: { match: true },
      orderBy: { match: { kickoff: 'asc' } },
    });

    const result: CopyResult = { copied: [], skipped: [], wildcardsDropped: [] };
    const now = new Date();
    for (const source of sourcePredictions) {
      if (!isMatchPredictable(source.match, now)) {
        result.skipped.push({ matchId: source.matchId, reason: 'LOCKED' });
        continue;
      }

      // Solo se mira el comodin del destino cuando de verdad se puede copiar
      // (mismo modo): de exacto a 1X2 el "x2" no tiene equivalente. Se consulta
      // partido a partido porque cada comodin que se copia gasta uno de los
      // disponibles del destino.
      const usesWildcard = source.doublePointsWildcard || source.doubleChanceOption !== null;
      const wildcardAvailable =
        usesWildcard && sourceMode === targetMode
          ? await this.canUseWildcard(userId, targetGroupId, matchday.id, source.matchId)
          : false;

      const plan = planCopy(source, sourceMode, targetMode, wildcardAvailable);
      if ('skip' in plan) {
        result.skipped.push({ matchId: source.matchId, reason: plan.skip });
        continue;
      }

      try {
        const saved = await this.submit(userId, targetGroupId, {
          matchId: source.matchId,
          ...plan.submission,
        });
        result.copied.push(saved);
        if (plan.wildcardDropped) result.wildcardsDropped.push(source.matchId);
      } catch (error) {
        // El partido pudo empezar entre la comprobacion y el guardado.
        this.logger.warn(
          `No se pudo copiar el pronostico de ${source.matchId} a ${targetGroupId}: ${error}`,
        );
        result.skipped.push({
          matchId: source.matchId,
          reason: error instanceof ForbiddenException ? 'LOCKED' : 'FAILED',
        });
      }
    }
    return result;
  }

  private async canUseWildcard(
    userId: string,
    groupId: string,
    matchdayId: string,
    matchId: string,
  ): Promise<boolean> {
    try {
      await this.wildcardsService.assertCanUseDoubleChance(userId, groupId, matchdayId, matchId);
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) return false;
      throw error;
    }
  }

  /** La jornada existe y pertenece a una competicion activa del grupo (igual que al reclamar el comodin extra, ver WildcardsService.claimAdReward). */
  private async getMatchdayInActiveCompetition(groupId: string, matchdayId: string) {
    const matchday = await this.prisma.matchday.findUnique({
      where: { id: matchdayId },
      select: { id: true, competitionId: true },
    });
    if (!matchday) {
      throw new NotFoundException('Jornada no encontrada');
    }
    const active = await this.prisma.groupCompetition.findFirst({
      where: { groupId, competitionId: matchday.competitionId, isActive: true },
      select: { id: true },
    });
    if (!active) {
      throw new ForbiddenException(
        'Esa jornada no pertenece a una competición activa de este grupo',
      );
    }
    return matchday;
  }

  async getMine(userId: string, groupId: string, matchdayId: string) {
    await this.groupsService.assertIsMember(groupId, userId);
    return this.prisma.prediction.findMany({
      where: { userId, groupId, match: { matchdayId } },
    });
  }

  /**
   * Predicciones de todos los miembros para una jornada. Solo se exponen
   * una vez cerrada la jornada, para no permitir copiar pronosticos ajenos
   * antes del cierre.
   */
  async getGroupPredictionsForMatchday(userId: string, groupId: string, matchdayId: string) {
    await this.groupsService.assertIsMember(groupId, userId);

    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      throw new NotFoundException('Jornada no encontrada');
    }
    if (matchday.status !== 'CLOSED' && matchday.status !== 'FINISHED') {
      throw new ForbiddenException('Las predicciones del grupo se ven cuando cierra la jornada');
    }

    const predictions = await this.prisma.prediction.findMany({
      where: { groupId, match: { matchdayId } },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            avatarBackground: true,
            experience: true,
          },
        },
      },
    });
    return predictions.map((p) => ({
      ...p,
      user: { ...p.user, level: xpProgressForLevel(p.user.experience).level },
    }));
  }

  /**
   * Puntua todas las predicciones de una jornada ya finalizada. Idempotente:
   * recalcula siempre a partir del resultado actual, asi que relanzar el
   * job tras corregir un resultado no duplica ni desincroniza puntos.
   */
  async scoreFinishedMatchday(matchdayId: string): Promise<number> {
    const predictions = await this.prisma.prediction.findMany({
      where: { match: { matchdayId } },
      include: { match: true, group: { select: { scoringMode: true } } },
    });

    let scored = 0;
    for (const prediction of predictions) {
      if (prediction.match.status !== 'FINISHED') {
        continue;
      }
      const points =
        prediction.group.scoringMode === 'EXACT_SCORE'
          ? calculateExactScorePoints(
              prediction,
              prediction.match.homeScore,
              prediction.match.awayScore,
            )
          : calculatePoints(
              { choice: prediction.choice, doubleChanceOption: prediction.doubleChanceOption },
              prediction.match.result,
            );
      await this.prisma.prediction.update({
        where: { id: prediction.id },
        data: { pointsEarned: points },
      });
      scored += 1;
    }
    return scored;
  }
}
