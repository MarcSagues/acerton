import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MemberEligibility {
  userId: string;
  /** Jornadas ya cerradas de las competiciones activas del grupo, desde que se incorporo (excluye las cerradas antes). */
  availableMatchdays: number;
  /** De esas, en cuantas mando al menos un pronostico ("un pronostico basta para participar en una jornada"). */
  participatedMatchdays: number;
  /** true si participatedMatchdays / availableMatchdays >= 50% (incluyendo exactamente el 50%). Sin jornadas disponibles todavia, no elegible. */
  eligible: boolean;
}

@Injectable()
export class EligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Elegibilidad de un miembro concreto para optar a premios (product-rules.md
   * § "Temporadas y participacion"): al menos el 50% de sus jornadas
   * disponibles desde que se incorporo, excluyendo las que ya estaban
   * cerradas al entrar. Solo cuentan las competiciones activas ahora mismo
   * del grupo — si se desactiva una despues, sus jornadas dejan de contar
   * tanto en el numerador como en el denominador (no hay retroactividad
   * negativa, igual que no la hay al anadir una nueva).
   */
  async computeMemberEligibility(groupId: string, userId: string): Promise<MemberEligibility> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
      return { userId, availableMatchdays: 0, participatedMatchdays: 0, eligible: false };
    }

    const activeCompetitions = await this.prisma.groupCompetition.findMany({
      where: { groupId, isActive: true },
      select: { competitionId: true },
    });
    const competitionIds = activeCompetitions.map((gc) => gc.competitionId);
    if (competitionIds.length === 0) {
      return { userId, availableMatchdays: 0, participatedMatchdays: 0, eligible: false };
    }

    const availableMatchdays = await this.prisma.matchday.findMany({
      where: {
        competitionId: { in: competitionIds },
        closesAt: { gt: membership.joinedAt },
        status: { in: ['CLOSED', 'FINISHED'] },
      },
      select: { id: true },
    });
    if (availableMatchdays.length === 0) {
      return { userId, availableMatchdays: 0, participatedMatchdays: 0, eligible: false };
    }

    const matchdayIds = availableMatchdays.map((m) => m.id);
    const predictions = await this.prisma.prediction.findMany({
      where: { groupId, userId, match: { matchdayId: { in: matchdayIds } } },
      select: { match: { select: { matchdayId: true } } },
    });
    const participatedMatchdayIds = new Set(predictions.map((p) => p.match.matchdayId));

    const available = matchdayIds.length;
    const participated = participatedMatchdayIds.size;
    return {
      userId,
      availableMatchdays: available,
      participatedMatchdays: participated,
      eligible: participated / available >= 0.5,
    };
  }

  /** Elegibilidad de todos los miembros de un grupo — base para "candidatos validos" (minimo 3) en el reparto de premios (Sprint 6). */
  async computeGroupEligibility(groupId: string): Promise<MemberEligibility[]> {
    const members = await this.prisma.groupMembership.findMany({
      where: { groupId },
      select: { userId: true },
    });
    return Promise.all(members.map((m) => this.computeMemberEligibility(groupId, m.userId)));
  }
}
