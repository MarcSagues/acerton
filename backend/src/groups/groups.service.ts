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
import { Group, GroupRole, Prisma, ScoringMode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfig } from '../config/configuration';
import { CompetitionsService } from '../competitions/competitions.service';
import { MatchdaysService } from '../matchdays/matchdays.service';
import { BadgesService } from '../badges/badges.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupRulesDto } from './dto/update-group-rules.dto';
import { SearchPublicGroupsDto } from './dto/search-public-groups.dto';
import { generateInviteCode } from './invite-code.util';

/** Todo lo publicado por debajo debe excluir grupos eliminados (borrado logico). */
const NOT_DELETED = { deletedAt: null } as const;

export const PUBLIC_GROUP_INCLUDE = {
  _count: { select: { memberships: true } },
  groupCompetitions: { where: { isActive: true }, include: { competition: true } },
} satisfies Prisma.GroupInclude;

export type PublicGroupRecord = Prisma.GroupGetPayload<{ include: typeof PUBLIC_GROUP_INCLUDE }>;

export interface PublicGroupCompetitionSummary {
  id: string;
  code: string;
  name: string;
  logoUrl: string | null;
}

export interface PublicGroupSummary {
  id: string;
  name: string;
  description: string | null;
  memberCount: number;
  scoringMode: ScoringMode;
  comebackEnabled: boolean;
  createdAt: Date;
  competitions: PublicGroupCompetitionSummary[];
  /** Si quien pide el listado ya pertenece a este grupo: el frontend cambia "Unirme" por "Unido" y deshabilita el boton en vez de dejar que se una dos veces. */
  isMember: boolean;
}

/** Fuera de la clase para poder reutilizarse sin instanciar GroupsService (ver PublicGroupPreviewService). */
export function toPublicGroupSummary(group: PublicGroupRecord, isMember: boolean): PublicGroupSummary {
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    memberCount: group._count.memberships,
    scoringMode: group.scoringMode,
    comebackEnabled: group.comebackEnabled,
    createdAt: group.createdAt,
    competitions: group.groupCompetitions.map((gc) => ({
      id: gc.competition.id,
      code: gc.competition.code,
      name: gc.competition.name,
      logoUrl: gc.competition.logoUrl,
    })),
    isMember,
  };
}

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly competitionsService: CompetitionsService,
    @Inject(forwardRef(() => MatchdaysService))
    private readonly matchdaysService: MatchdaysService,
    private readonly badgesService: BadgesService,
  ) {}

  async create(userId: string, dto: CreateGroupDto): Promise<Group> {
    const inviteCode = await this.generateUniqueInviteCode();
    const defaults = this.configService.get('comeback', { infer: true });
    const scoringMode = dto.scoringMode ?? 'ONE_X_TWO';

    const group = await this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        isPublic: dto.isPublic ?? false,
        inviteCode,
        scoringMode,
        comebackEnabled: dto.comebackEnabled ?? defaults.enabled,
        comebackPointsPerBonus: dto.comebackPointsPerBonus ?? defaults.pointsPerBonus,
        ownerId: userId,
        memberships: {
          create: { userId, role: GroupRole.ADMIN },
        },
      },
    });
    // Sin al menos una competicion activa un grupo nunca llega a tener
    // clasificacion (ver GroupsService.findMineForUser) — se obliga a elegir
    // desde la propia creacion en vez de dejarlo como paso opcional posterior.
    await this.setCompetitions(group.id, dto.competitionIds);
    // "Fundador": unica insignia que se concede al momento en vez de esperar
    // a que cierre una jornada (ver BadgesService.checkGroupFounder) — no
    // debe poder romper la creacion del grupo si falla.
    await this.badgesService.checkGroupFounder(userId, group.id);
    return this.findByIdForMember(group.id, userId);
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

  /**
   * Solo el admin puede tocar las reglas del grupo; se editan por separado
   * de las competiciones. El comodin de remontada se admite en ambos modos
   * de puntuacion (doble oportunidad en 1X2, duplicar puntos en resultado
   * exacto — ver WildcardsService.getComebackStatus).
   */
  async updateRules(groupId: string, dto: UpdateGroupRulesDto): Promise<Group> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      select: { scoringMode: true },
    });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    return this.prisma.group.update({
      where: { id: groupId },
      data: {
        comebackEnabled: dto.comebackEnabled,
        comebackPointsPerBonus: dto.comebackPointsPerBonus,
        isPublic: dto.isPublic,
      },
    });
  }

  /**
   * Ademas de los datos propios del grupo, adjunta la posicion general
   * (clasificacion TOTAL) del usuario en cada uno, para la preview de la
   * lista "Mis grupos" — mismo criterio de scope que usa la pantalla de
   * Tabla: si el grupo tiene mas de una competicion activa se usa la
   * clasificacion combinada (competitionId null), si tiene exactamente
   * una se usa la suya, y si no tiene ninguna todavia no hay posicion.
   */
  async findMineForUser(userId: string) {
    const groups = await this.prisma.group.findMany({
      where: { ...NOT_DELETED, memberships: { some: { userId } } },
      include: {
        _count: { select: { memberships: true } },
        groupCompetitions: { include: { competition: true } },
        memberships: { where: { userId }, select: { isFavorite: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();
    const results = await Promise.all(
      groups.map(async (group) => {
        const { memberships, ...groupData } = group;
        const isFavorite = memberships[0]?.isFavorite ?? false;
        const activeCompetitionIds = group.groupCompetitions
          .filter((gc) => gc.isActive)
          .map((gc) => gc.competitionId);
        if (activeCompetitionIds.length === 0) {
          return { ...groupData, myPosition: null, hasPendingPicks: false, isFavorite };
        }
        const competitionId = activeCompetitionIds.length === 1 ? activeCompetitionIds[0] : null;
        const [snapshot, hasPendingPicks] = await Promise.all([
          this.prisma.rankingSnapshot.findFirst({
            where: { groupId: group.id, userId, period: 'TOTAL', competitionId },
            orderBy: { createdAt: 'desc' },
          }),
          this.hasPendingPicksForGroup(group.id, activeCompetitionIds, group.scoringMode, userId, now),
        ]);
        return {
          ...groupData,
          myPosition: snapshot ? { position: snapshot.position, points: snapshot.points } : null,
          hasPendingPicks,
          isFavorite,
        };
      }),
    );

    // Favoritos siempre arriba (boton "favoritos" en Grupos), manteniendo el
    // orden por fecha de creacion dentro de cada bloque — Array.sort es
    // estable en Node, asi que basta comparar el flag.
    return results.sort((a, b) => Number(b.isFavorite) - Number(a.isFavorite));
  }

  /**
   * true si a este usuario le queda algun partido abierto sin pronosticar en
   * alguna de las competiciones activas del grupo — misma regla que el punto
   * rojo de "Jornada" (ver CurrentMatchdayFacade.hasPendingPicks en el
   * frontend), pero calculada aqui para poder mostrar el aviso en el
   * selector/listado de grupos sin tener que cargar la jornada completa de
   * cada uno en el cliente.
   */
  private async hasPendingPicksForGroup(
    groupId: string,
    competitionIds: string[],
    scoringMode: ScoringMode,
    userId: string,
    now: Date,
  ): Promise<boolean> {
    for (const competitionId of competitionIds) {
      const matchday = await this.matchdaysService.getCurrentMatchdayForCompetition(competitionId);
      if (!matchday || matchday.status === 'FINISHED') continue;

      const isMatchdayOpenByTime = new Date(matchday.opensAt).getTime() <= now.getTime();
      if (!matchday.canPredict || !isMatchdayOpenByTime) continue;

      const predictions = await this.prisma.prediction.findMany({
        where: { userId, groupId, match: { matchdayId: matchday.id } },
      });
      const byMatchId = new Map(predictions.map((p) => [p.matchId, p]));

      const pending = matchday.matches.some((match) => {
        const isPredictable = match.status === 'SCHEDULED' && match.kickoff.getTime() > now.getTime();
        if (!isPredictable) return false;
        const prediction = byMatchId.get(match.id);
        if (scoringMode === 'EXACT_SCORE') {
          return prediction?.predictedHomeScore == null || prediction?.predictedAwayScore == null;
        }
        return !prediction?.choice && !prediction?.doubleChanceOption;
      });
      if (pending) return true;
    }
    return false;
  }

  /**
   * Busqueda paginada de grupos publicos para la vista de exploracion
   * (distinta del listado sin filtros que antes se mostraba dentro de Mis
   * grupos). No expone inviteCode ni ownerId: el DTO de salida solo incluye
   * lo necesario para decidir si unirse.
   */
  async searchPublicGroups(
    filters: SearchPublicGroupsDto,
    userId: string,
  ): Promise<{ items: PublicGroupSummary[]; nextCursor: string | null }> {
    const limit = filters.limit ?? 20;
    const where: Prisma.GroupWhereInput = {
      ...NOT_DELETED,
      isPublic: true,
      ...(filters.q ? { name: { contains: filters.q, mode: 'insensitive' } } : {}),
      ...(filters.scoringMode ? { scoringMode: filters.scoringMode } : {}),
      // Un grupo debe cumplir TODAS las ligas seleccionadas, no solo alguna:
      // una condicion AND independiente por cada una en vez de un unico "in".
      ...(filters.competitionIds && filters.competitionIds.length > 0
        ? {
            AND: filters.competitionIds.map((competitionId) => ({
              groupCompetitions: { some: { competitionId, isActive: true } },
            })),
          }
        : {}),
    };

    const groups = await this.prisma.group.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
      include: PUBLIC_GROUP_INCLUDE,
    });

    const hasMore = groups.length > limit;
    const page = hasMore ? groups.slice(0, limit) : groups;

    // Un unico findMany para toda la pagina en vez de una consulta de
    // membresia por grupo (N+1): con hasta 20 grupos por pagina, la
    // diferencia es real.
    const memberships =
      page.length > 0
        ? await this.prisma.groupMembership.findMany({
            where: { userId, groupId: { in: page.map((group) => group.id) } },
            select: { groupId: true },
          })
        : [];
    const memberGroupIds = new Set(memberships.map((m) => m.groupId));

    return {
      items: page.map((group) => toPublicGroupSummary(group, memberGroupIds.has(group.id))),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    };
  }

  /** Para la vista previa de un grupo publico (PublicGroupPreviewService): si quien la pide ya es miembro, el frontend cambia "Unirme" por "Unido". */
  async isGroupMember(groupId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    return membership !== null;
  }

  /**
   * Un unico grupo publico por id, con la misma forma que searchPublicGroups
   * (sin inviteCode ni ownerId). Usado por PublicGroupPreviewService para
   * componer la vista previa junto con la clasificacion (ver ese servicio:
   * vive en su propio modulo para no crear un ciclo Groups<->Rankings).
   * Null si no existe, es privado o esta eliminado — el llamador decide el
   * 404, igual que el resto de accesos por id.
   */
  findPublicGroupById(groupId: string): Promise<PublicGroupRecord | null> {
    return this.prisma.group.findFirst({
      where: { id: groupId, ...NOT_DELETED, isPublic: true },
      include: PUBLIC_GROUP_INCLUDE,
    });
  }

  /**
   * Mismo tipo de resultado que findPublicGroupById, pero por codigo de
   * invitacion y sin filtrar por isPublic: tener el codigo (privado o
   * publico) es la propia autorizacion para ver la vista previa. Usado por
   * PublicGroupPreviewService para la pantalla de "unirse por link/codigo"
   * (ver PublicGroupPreviewService.getPreviewByInviteCode).
   */
  findGroupByInviteCode(inviteCode: string): Promise<PublicGroupRecord | null> {
    return this.prisma.group.findFirst({
      where: { inviteCode, ...NOT_DELETED },
      include: PUBLIC_GROUP_INCLUDE,
    });
  }

  /**
   * Un grupo eliminado (borrado logico) se trata como inexistente para
   * cualquier acceso normal — su historial sigue en base de datos para
   * temporadas/trofeos, pero deja de resolverse por esta via.
   */
  async findByIdForMember(groupId: string, userId: string) {
    const group = await this.prisma.group.findFirst({
      where: { id: groupId, ...NOT_DELETED },
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
    const group = await this.prisma.group.findFirst({ where: { inviteCode, ...NOT_DELETED } });
    if (!group) {
      throw new NotFoundException('Código de invitación inválido');
    }
    await this.addMember(group.id, userId);
    return group;
  }

  async joinPublicGroup(groupId: string, userId: string): Promise<Group> {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, ...NOT_DELETED } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    if (!group.isPublic) {
      throw new ForbiddenException('El grupo es privado, necesitas un link de invitación');
    }
    await this.addMember(groupId, userId);
    return group;
  }

  listMembers(groupId: string) {
    return this.prisma.groupMembership.findMany({
      where: { groupId },
      include: { user: { select: { id: true, name: true, avatarUrl: true, avatarBackground: true } } },
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

  /**
   * Silencia/reactiva los avisos de este grupo solo para quien lo pide
   * (product-rules.md "Notificaciones": opcion de silenciar grupos). No
   * requiere ser admin: cualquier miembro decide esto sobre su propia
   * membresia.
   */
  async setMuted(groupId: string, userId: string, muted: boolean): Promise<void> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este grupo');
    }
    await this.prisma.groupMembership.update({
      where: { userId_groupId: { userId, groupId } },
      data: { mutedNotifications: muted },
    });
  }

  /**
   * Marca/desmarca un grupo como favorito solo para quien lo pide (boton
   * "favoritos" en Grupos). Al igual que silenciar, es por membresia
   * propia, no requiere ser admin. Se usa para fijar el grupo arriba del
   * todo tanto en la lista de "Mis grupos" como en el selector — ver
   * findMineForUser.
   */
  async setFavorite(groupId: string, userId: string, favorite: boolean): Promise<void> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este grupo');
    }
    await this.prisma.groupMembership.update({
      where: { userId_groupId: { userId, groupId } },
      data: { isFavorite: favorite },
    });
  }

  async assertIsAdmin(groupId: string, userId: string): Promise<void> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership || membership.role !== GroupRole.ADMIN) {
      throw new ForbiddenException('Solo un administrador del grupo puede hacer esto');
    }
  }

  /** El creador tiene control total: nombrar/quitar admins, transferir propiedad, eliminar el grupo. */
  async assertIsOwner(groupId: string, userId: string): Promise<void> {
    const group = await this.prisma.group.findUnique({ where: { id: groupId }, select: { ownerId: true } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    if (group.ownerId !== userId) {
      throw new ForbiddenException('Solo el creador del grupo puede hacer esto');
    }
  }

  /** El creador debe transferir la propiedad o eliminar el grupo antes de poder salir. */
  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.prisma.group.findFirst({ where: { id: groupId, ...NOT_DELETED } });
    if (!group) {
      throw new NotFoundException('Grupo no encontrado');
    }
    if (group.ownerId === userId) {
      throw new BadRequestException(
        'El creador debe transferir la propiedad o eliminar el grupo antes de salir',
      );
    }
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) {
      throw new ForbiddenException('No perteneces a este grupo');
    }
    // Predicciones, rachas e insignias cuelgan de userId+groupId directamente,
    // no de esta membership, asi que salir no arrastra el historial.
    await this.prisma.groupMembership.delete({ where: { id: membership.id } });
  }

  /**
   * Expulsa a un miembro normal. Ni un admin ni el propio creador pueden
   * expulsar a otro admin o al creador por esta via: primero hay que quitarle
   * el rol de admin (updateMemberRole), que es una operacion exclusiva del
   * creador.
   */
  async kickMember(groupId: string, requesterId: string, targetUserId: string): Promise<void> {
    await this.assertIsAdmin(groupId, requesterId);
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!membership) {
      throw new NotFoundException('Ese usuario no es miembro del grupo');
    }
    if (membership.role === GroupRole.ADMIN) {
      throw new ForbiddenException('No se puede expulsar a un administrador ni al creador del grupo');
    }
    await this.prisma.groupMembership.delete({ where: { id: membership.id } });
  }

  /** Nombrar o quitar administradores es una potestad exclusiva del creador. */
  async updateMemberRole(
    groupId: string,
    requesterId: string,
    targetUserId: string,
    role: GroupRole,
  ): Promise<void> {
    await this.assertIsOwner(groupId, requesterId);
    const group = await this.prisma.group.findUniqueOrThrow({ where: { id: groupId } });
    if (targetUserId === group.ownerId) {
      throw new ForbiddenException(
        'El creador siempre es administrador; transfiere la propiedad para cambiar esto',
      );
    }
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: targetUserId, groupId } },
    });
    if (!membership) {
      throw new NotFoundException('Ese usuario no es miembro del grupo');
    }
    await this.prisma.groupMembership.update({ where: { id: membership.id }, data: { role } });
  }

  /** El nuevo propietario debe ser ya miembro del grupo; queda como admin. */
  async transferOwnership(groupId: string, requesterId: string, newOwnerUserId: string): Promise<Group> {
    await this.assertIsOwner(groupId, requesterId);
    if (newOwnerUserId === requesterId) {
      throw new BadRequestException('Ya eres el propietario de este grupo');
    }
    const membership = await this.prisma.groupMembership.findUnique({
      where: { userId_groupId: { userId: newOwnerUserId, groupId } },
    });
    if (!membership) {
      throw new BadRequestException('El nuevo propietario debe ser ya miembro del grupo');
    }
    const [, , group] = await this.prisma.$transaction([
      this.prisma.groupMembership.update({
        where: { id: membership.id },
        data: { role: GroupRole.ADMIN },
      }),
      this.prisma.groupMembership.update({
        where: { userId_groupId: { userId: requesterId, groupId } },
        data: { role: GroupRole.ADMIN },
      }),
      this.prisma.group.update({ where: { id: groupId }, data: { ownerId: newOwnerUserId } }),
    ]);
    return group;
  }

  /** Borrado logico: el grupo desaparece de vistas activas pero conserva su historial. */
  async deleteGroup(groupId: string, requesterId: string): Promise<void> {
    await this.assertIsOwner(groupId, requesterId);
    await this.prisma.group.update({ where: { id: groupId }, data: { deletedAt: new Date() } });
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
      throw new BadRequestException('Selecciona al menos una competición');
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
    throw new Error('No se pudo generar un código de invitación único');
  }
}
