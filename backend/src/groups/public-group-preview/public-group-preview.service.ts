import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupsService, PublicGroupSummary, toPublicGroupSummary } from '../groups.service';
import { RankingsService } from '../../rankings/rankings.service';

export interface PublicGroupPreview extends PublicGroupSummary {
  /** Null salvo modo 1X2 con el comodin activo: en el resto no aplica. */
  comebackPointsPerBonus: number | null;
  topRanking: { userId: string; name: string; position: number; points: number }[];
}

/**
 * Vive en su propio modulo (no dentro de GroupsService) para poder depender
 * de GroupsService y RankingsService a la vez sin crear un ciclo de modulos:
 * RankingsModule ya importa GroupsModule (para el resto de endpoints de
 * clasificacion), asi que si GroupsModule importara ademas RankingsModule
 * se cerraria un ciclo de 3 (Groups -> Rankings -> Seasons -> Groups) que
 * NestJS no resuelve con forwardRef porque el problema es de resolucion de
 * imports de JS/TS, no solo de inyeccion de dependencias.
 */
@Injectable()
export class PublicGroupPreviewService {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly rankingsService: RankingsService,
  ) {}

  /**
   * Detalle, reglas reales y top 5 de la clasificacion general de un grupo
   * publico, sin crear membresia. Rechaza grupos privados o eliminados como
   * si no existieran, igual que el resto de accesos por id.
   */
  async getPreview(groupId: string, userId: string): Promise<PublicGroupPreview> {
    const group = await this.groupsService.findPublicGroupById(groupId);
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    const isMember = await this.groupsService.isGroupMember(groupId, userId);

    const activeCompetitionIds = group.groupCompetitions.map((gc) => gc.competitionId);
    const competitionId = activeCompetitionIds.length === 1 ? activeCompetitionIds[0] : null;

    // Sin jornadas puntuadas todavia no hay ninguna fila de RankingSnapshot:
    // se deja el top vacio (estado vacio en el frontend) en vez de mostrar a
    // todo el mundo empatado a 0, que no aporta nada a quien no es miembro.
    const hasRanking =
      activeCompetitionIds.length > 0 && (await this.rankingsService.hasRanking(group.id, 'TOTAL', competitionId));

    const topRanking = hasRanking
      ? (await this.rankingsService.getLatestRanking(group.id, 'TOTAL', competitionId))
          .slice(0, 5)
          .map((row) => ({ userId: row.userId, name: row.user.name, position: row.position, points: row.points }))
      : [];

    return {
      ...toPublicGroupSummary(group, isMember),
      comebackPointsPerBonus:
        group.scoringMode === 'ONE_X_TWO' && group.comebackEnabled ? group.comebackPointsPerBonus : null,
      topRanking,
    };
  }
}
