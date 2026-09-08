import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prediction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WildcardsService } from '../wildcards/wildcards.service';
import { GroupsService } from '../groups/groups.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { SubmitPredictionDto } from './dto/submit-prediction.dto';
import { calculateExactScorePoints, calculatePoints } from './scoring.util';
import { isMatchPredictable } from '../matchdays/matchday.util';

@Injectable()
export class PredictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wildcardsService: WildcardsService,
    private readonly groupsService: GroupsService,
    private readonly matchdaysService: MatchdaysService,
  ) {}

  async submit(userId: string, groupId: string, dto: SubmitPredictionDto): Promise<Prediction> {
    await this.groupsService.assertIsMember(groupId, userId);
    const scoringMode = await this.groupsService.getScoringMode(groupId);

    const match = await this.prisma.match.findUnique({ where: { id: dto.matchId } });
    if (!match) {
      throw new NotFoundException('Partido no encontrado');
    }
    if (!isMatchPredictable(match, new Date())) {
      throw new ForbiddenException('Este partido ya ha empezado, no se admiten mas predicciones');
    }
    if (!(await this.matchdaysService.canAcceptPredictions(match.matchdayId))) {
      throw new ForbiddenException(
        'Todavia no se puede predecir esta jornada, espera a que sea la jornada actual',
      );
    }

    if (scoringMode === 'EXACT_SCORE') {
      if (dto.choice || dto.doubleChanceOption) {
        throw new BadRequestException('Este grupo juega en modo resultado exacto, no admite pronostico 1X2');
      }
      if (dto.predictedHomeScore === undefined || dto.predictedAwayScore === undefined) {
        throw new BadRequestException('Falta el resultado exacto (goles local y visitante)');
      }
      return this.prisma.prediction.upsert({
        where: { userId_groupId_matchId: { userId, groupId, matchId: dto.matchId } },
        update: {
          predictedHomeScore: dto.predictedHomeScore,
          predictedAwayScore: dto.predictedAwayScore,
          choice: null,
          doubleChanceOption: null,
        },
        create: {
          userId,
          groupId,
          matchId: dto.matchId,
          predictedHomeScore: dto.predictedHomeScore,
          predictedAwayScore: dto.predictedAwayScore,
        },
      });
    }

    if (dto.predictedHomeScore !== undefined || dto.predictedAwayScore !== undefined) {
      throw new BadRequestException('Este grupo juega en modo 1X2, no admite resultado exacto');
    }

    const isDoubleChance = !!dto.doubleChanceOption;
    if (!isDoubleChance && !dto.choice) {
      throw new BadRequestException('Falta el pronostico 1X2');
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

    return this.prisma.prediction.upsert({
      where: { userId_groupId_matchId: { userId, groupId, matchId: dto.matchId } },
      update: { choice, doubleChanceOption },
      create: { userId, groupId, matchId: dto.matchId, choice, doubleChanceOption },
    });
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

    return this.prisma.prediction.findMany({
      where: { groupId, match: { matchdayId } },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
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
          ? calculateExactScorePoints(prediction, prediction.match.homeScore, prediction.match.awayScore)
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
