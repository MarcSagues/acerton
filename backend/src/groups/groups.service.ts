import {
  BadRequestException,
  ConflictException,
  forwardRef,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Group, GroupRole, ScoringMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { CompetitionsService } from '../competitions/competitions.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupRulesDto } from './dto/update-group-rules.dto';
import { generateInviteCode } from './invite-code.util';

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly competitionsService: CompetitionsService,
    @Inject(forwardRef(() => MatchdaysService))
    private readonly matchdaysService: MatchdaysService,
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<Group> {
    const inviteCode = await this.generateUniqueInviteCode();
    const defaults = this.configService.get('comeback', { infer: true });
    const scoringMode = dto.scoringMode ?? 'ONE_X_TWO';
    // El comodin de remontada es un concepto 1X2 (doble oportunidad); en modo
    // resultado exacto se fuerza desactivado pase lo que llegue en el DTO.
    const isExactScore = scoringMode === 'EXACT_SCORE';

    return this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        inviteCode,
        scoringMode,
        comebackEnabled: isExactScore ? false : (dto.comebackEnabled ?? defaults.enabled),
        comebackPointsPerBonus: dto.comebackPointsPerBonus ?? defaults.pointsPerBonus,
        memberships: {
          create: { userId, role: GroupRole.ADMIN },
        },
      },
    });
  }

  /** Solo se usa para decidir la validacion del pronostico (ver PredictionsService.submit). */
  async getScoringMode(groupId: string): Promise<ScoringMode> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { scoringMode: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    return group.scoringMode;
  }

  /** Solo el admin puede tocar las reglas del grupo; se editan por separado de las competiciones. */
  async updateRules(groupId: string, dto: UpdateGroupRulesDto): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { scoringMode: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    // El comodin de remontada no existe en modo resultado exacto: se ignora
    // cualquier intento de reactivarlo aunque se llame al endpoint directamente.
    if (group.scoringMode === 'EXACT_SCORE' && dto.comebackEnabled === true) {
      throw new BadRequestException('El comodin de remontada no esta disponible en grupos de resultado exacto');
    }
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        comebackEnabled: group.scoringMode === 'EXACT_SCORE' ? false : dto.comebackEnabled,
        comebackPointsPerBonus: dto.comebackPointsPerBonus,
        isPublic: dto.isPublic,
      },
    });
  }

  findMineForUser(userId: string) {
    return this.prisma.group.findMany({
      where: { memberships: { some: { userId } } },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findPublicGroups() {
    return this.prisma.group.findMany({
      where: { isPublic: true },
      include: { _count: { select: { memberships: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdForMember(groupId: string, userId: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        groupCompetitions: { include: { competition: true } },
        _count: { select: { memberships: true } },
      },
    });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }

    if (!group.isPublic) {
      await this.assertIsMember(groupId, userId);
    }

    return group;
  }

  async joinByInviteCode(inviteCode: string, userId: string): Promise<Group> {
    const group = await this.prisma.group.findUnique({ where: { inviteCode } });
    if (!group) {
      throw new NotFoundException('Codigo de invitacion invalido');
    }
    await this.addMember(group.id, userId);
    return group;
  }

  async joinPublicGroup(groupId: string, userId: string): Promise<Group> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    if (!group.isPublic) {
      throw new ForbiddenException('El grupo es privado, necesitas un link de invitacion');
    }
    await this.addMember(groupId, userId);
    return group;
  }

  listMembers(groupId: string) {
    return this.prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { joinedAt: 'asc' },
    });
  }

  async assertIsMember(groupId: string, userId: string): Promise<void> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este grupo');
    }
  }

  async assertIsAdmin(groupId: string, userId: string): Promise<void> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership || membership.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Solo un administrador del grupo puede hacer esto');
    }
  }

  /**
   * Activa competiciones para el grupo. Una vez activada una competicion no
   * se puede volver a desactivar (solo anadir nuevas) — evita que a mitad de
   * temporada se le quite a alguien una liga en la que ya lleva jornadas
   * jugadas, prediciones hechas y comodines gastados. Ademas, al activar
   * sincroniza su jornada en curso al momento en vez de esperar al proximo
   * tick del cron (que corre a horas fijas, hasta 12h de espera) — si no, un
   * grupo recien creado se queda sin jornada visible durante horas.
   */
  async setCompetitions(groupId: string, competitionIds: string[]): Promise<void> {
    if (competitionIds.length === 0) {
      throw new BadRequestException('Selecciona al menos una competicion');
    }

    const currentlyActive = await this.competitionsService.findActiveByGroup(groupId);
    const missing = currentlyActive.filter(
      (gc) => !competitionIds.includes(gc.competitionId),
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        'No se pueden desactivar competiciones ya activadas en el grupo, solo anadir nuevas',
      );
    }

    await this.competitionsService.setGroupCompetitions(groupId, competitionIds);

    for (const competitionId of competitionIds) {
      try {
        await this.matchdaysService.syncCurrentRound(competitionId);
      } catch (error) {
        this.logger.error(`Error sincronizando competicion ${competitionId}`, error as Error);
      }
    }
  }

  private async addMember(groupId: string, userId: string): Promise<void> {
    const existing = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (existing) {
      throw new ConflictException('Ya eres miembro de este grupo');
    }
    await this.prisma.groupMembership.create({
      data: { groupId, userId, role: GroupRole.MEMBER },
    });
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateInviteCode();
      const existing = await this.prisma.group.findUnique({ where: { inviteCode: code } });
      if (!existing) {
        return code;
      }
    }
    throw new Error('No se pudo generar un codigo de invitacion unico');
  }
}
