import { Inject, Injectable, Logger } from '@nestjs/common';
import { Competition, GroupSeason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FOOTBALL_PROVIDER, FootballProvider } from '../football-data/football-provider.interface';
import { computeSeasonLabel } from './season-label.util';

const FINISHED_OR_RESOLVED = new Set(['FINISHED', 'CANCELLED']);

@Injectable()
export class SeasonsService {
  private readonly logger = new Logger(SeasonsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FOOTBALL_PROVIDER) private readonly footballProvider: FootballProvider,
  ) {}

  /** La temporada en curso de un grupo, creandola si todavia no tiene ninguna abierta. */
  async getOpenSeason(groupId: string): Promise<GroupSeason> {
    const existing = await this.prisma.groupSeason.findFirst({ where: { groupId, endedAt: null } });
    if (existing) {
      return existing;
    }
    return this.prisma.groupSeason.create({
      data: { groupId, label: computeSeasonLabel(new Date()) },
    });
  }

  /** Todas las temporadas de un grupo, la abierta primero — para "temporadas anteriores consultables". */
  async listSeasons(groupId: string): Promise<GroupSeason[]> {
    return this.prisma.groupSeason.findMany({ where: { groupId }, orderBy: { startedAt: 'desc' } });
  }

  /**
   * Refresca el preview de fin de temporada de una competicion pidiendo su
   * calendario completo al proveedor (una peticion), y de paso dice si esa
   * competicion ya no tiene ningun partido pendiente (todos FINISHED o
   * CANCELLED) — que es lo que de verdad decide un cierre, no la fecha.
   * Si el proveedor todavia no tiene calendario (fixtures.length === 0), no
   * se toca nada: no hay datos para fiarse de un preview ni de un cierre.
   */
  async refreshCompetitionPreview(competitionId: string): Promise<{ finished: boolean } | null> {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      return null;
    }
    return this.refreshCompetitionPreviewFor(competition);
  }

  /** Variante que reutiliza una fila de Competition ya cargada, para no volver a pedirla dentro del mismo flujo. */
  private async refreshCompetitionPreviewFor(competition: Competition): Promise<{ finished: boolean } | null> {
    const fixtures = await this.footballProvider.getFullSeasonMatches(
      competition.externalId,
      competition.currentSeason,
    );
    if (fixtures.length === 0) {
      return null;
    }

    const lastKickoff = fixtures.reduce(
      (max, fixture) => (fixture.kickoff > max ? fixture.kickoff : max),
      fixtures[0].kickoff,
    );
    await this.prisma.competition.update({
      where: { id: competition.id },
      data: { seasonEndPreviewAt: lastKickoff },
    });

    return { finished: fixtures.every((fixture) => FINISHED_OR_RESOLVED.has(fixture.status)) };
  }

  /**
   * Se llama tras terminar del todo una jornada (ver JobsService). Solo
   * gasta una peticion al proveedor si esa jornada ya alcanza (o supera) el
   * preview conocido de fin de temporada de su competicion — el resto de
   * jornadas de la temporada no disparan ninguna comprobacion. Si tras
   * confirmar que la competicion ha terminado del todo TODAS las
   * competiciones activas de un grupo tambien lo estan, cierra su temporada.
   */
  async checkSeasonClosureAfterMatchdayFinished(competitionId: string, matchdayClosesAt: Date): Promise<void> {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      return;
    }
    if (competition.seasonEndPreviewAt && matchdayClosesAt < competition.seasonEndPreviewAt) {
      return; // Todavia quedan jornadas por delante segun el ultimo preview conocido.
    }

    const result = await this.refreshCompetitionPreviewFor(competition);
    if (!result?.finished) {
      return; // O no hay datos, o el proveedor añadio/reprogramo algo despues del preview anterior.
    }

    const groupCompetitions = await this.prisma.groupCompetition.findMany({
      where: { competitionId, isActive: true },
    });
    for (const gc of groupCompetitions) {
      await this.tryCloseGroupSeason(gc.groupId, competitionId, true);
    }
  }

  /**
   * `alreadyConfirmedCompetitionId` evita repetir la peticion que ya se
   * acaba de hacer para la competicion que disparo esta comprobacion.
   */
  private async tryCloseGroupSeason(
    groupId: string,
    alreadyConfirmedCompetitionId: string,
    alreadyConfirmedFinished: boolean,
  ): Promise<void> {
    const activeCompetitions = await this.prisma.groupCompetition.findMany({
      where: { groupId, isActive: true },
    });
    if (activeCompetitions.length === 0) {
      return;
    }

    for (const gc of activeCompetitions) {
      const finished =
        gc.competitionId === alreadyConfirmedCompetitionId
          ? alreadyConfirmedFinished
          : (await this.refreshCompetitionPreview(gc.competitionId))?.finished;
      if (!finished) {
        return; // Al menos una competicion activa del grupo no ha terminado todavia: no se cierra.
      }
    }

    const openSeason = await this.getOpenSeason(groupId);
    await this.prisma.groupSeason.update({ where: { id: openSeason.id }, data: { endedAt: new Date() } });
    this.logger.log(`Temporada ${openSeason.label} cerrada para el grupo ${groupId}`);
  }
}
