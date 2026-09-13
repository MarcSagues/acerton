import { Injectable, NotFoundException } from '@nestjs/common';
import { Competition } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompetitionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<Competition[]> {
    return this.prisma.competition.findMany({ orderBy: { name: 'asc' } });
  }

  async findById(id: string): Promise<Competition> {
    const competition = await this.prisma.competition.findUnique({ where: { id } });
    if (!competition) {
      throw new NotFoundException('Competición no encontrada');
    }
    return competition;
  }

  findActiveByGroup(groupId: string) {
    return this.prisma.groupCompetition.findMany({
      where: { groupId, isActive: true },
      include: { competition: true },
    });
  }

  /**
   * Reemplaza el conjunto de competiciones activas de un grupo por la lista
   * de codigos recibida (idempotente: activa las nuevas, desactiva el resto).
   */
  async setGroupCompetitions(groupId: string, competitionIds: string[]): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.groupCompetition.updateMany({
        where: { groupId },
        data: { isActive: false },
      });

      for (const competitionId of competitionIds) {
        await tx.groupCompetition.upsert({
          where: { groupId_competitionId: { groupId, competitionId } },
          update: { isActive: true },
          create: { groupId, competitionId, isActive: true },
        });
      }
    });
  }
}
