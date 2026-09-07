import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Competition, Matchday, MatchdayStatus, PredictionChoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FOOTBALL_PROVIDER,
  FootballProvider,
  ProviderFixture,
} from '../football-data/football-provider.interface';
import { computeMatchResult, parseRoundOrder, shouldCloseMatchday } from './matchday.util';

@Injectable()
export class MatchdaysService {
  private readonly logger = new Logger(MatchdaysService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(FOOTBALL_PROVIDER) private readonly footballProvider: FootballProvider,
  ) {}

  /**
   * Trae/actualiza la jornada en curso de una competicion desde el proveedor.
   * Si ya tenemos una jornada vigente (no finalizada) para la temporada
   * actual, no gastamos cupo de API volviendo a pedirla: solo hace falta
   * pedir una jornada nueva cuando la anterior termina (o no hay ninguna
   * todavia). Ahorro deliberado, no un descuido, pensado para planes
   * gratuitos con limite de peticiones.
   */
  async syncCurrentRound(competitionId: string): Promise<Matchday | null> {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      throw new NotFoundException('Competicion no encontrada');
    }

    const activeMatchday = await this.prisma.matchday.findFirst({
      where: {
        competitionId,
        season: competition.currentSeason,
        status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] },
      },
    });
    if (activeMatchday) {
      return activeMatchday;
    }

    const fixtures = await this.footballProvider.getCurrentRoundFixtures(
      competition.externalId,
      competition.currentSeason,
    );
    if (fixtures.length === 0) {
      return null;
    }

    const existingCount = await this.prisma.matchday.count({ where: { competitionId } });
    return this.persistRoundFixtures(competition, fixtures, existingCount);
  }

  /**
   * Jornada anterior/siguiente a una dada, dentro de la misma competicion,
   * ordenada por `order` (numero de jornada) en vez de por closesAt, para
   * que un partido reprogramado antes/despues de su jornada no desordene la
   * navegacion. Ambas direcciones se sincronizan bajo demanda contra el
   * proveedor la primera vez que se piden, si todavia no existen en BBDD:
   * "anterior" no esta garantizada solo porque ya haya pasado, ya que el
   * cron unicamente sincroniza la jornada "actual" (si el grupo/competicion
   * empezo a seguirse a partir de la jornada 6, las jornadas 1-5 nunca se
   * guardaron aunque ya se jugaran).
   */
  async getAdjacentMatchday(matchdayId: string, direction: 'previous' | 'next') {
    const current = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!current) {
      throw new NotFoundException('Jornada no encontrada');
    }

    if (direction === 'previous') {
      const previous = await this.prisma.matchday.findFirst({
        where: { competitionId: current.competitionId, order: { lt: current.order } },
        orderBy: { order: 'desc' },
      });
      if (previous) {
        return this.getMatchdayWithMatches(previous.id);
      }
      if (current.order <= 1) {
        return null;
      }
      return this.syncSpecificRound(current.competitionId, current.order - 1);
    }

    const existingNext = await this.prisma.matchday.findFirst({
      where: { competitionId: current.competitionId, order: { gt: current.order } },
      orderBy: { order: 'asc' },
    });
    if (existingNext) {
      return this.getMatchdayWithMatches(existingNext.id);
    }

    return this.syncSpecificRound(current.competitionId, current.order + 1);
  }

  /**
   * Sincroniza bajo demanda una jornada por su numero de orden concreto (no
   * la "actual" del proveedor) — usado para previsualizar la siguiente
   * jornada antes de que se convierta en la actual, o para traer una jornada
   * anterior que nunca llego a guardarse (la app empezo a seguir la
   * competicion mas tarde). Solo funciona en competiciones de liga regular
   * con jornadas numeradas: en fases de eliminatoria el proveedor puede no
   * devolver nada para ese numero, y entonces simplemente no hay jornada que
   * mostrar todavia en esa direccion.
   */
  private async syncSpecificRound(competitionId: string, roundNumber: number) {
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      throw new NotFoundException('Competicion no encontrada');
    }

    const fixtures = await this.footballProvider.getFixturesForRound(
      competition.externalId,
      competition.currentSeason,
      roundNumber,
    );
    if (fixtures.length === 0) {
      return null;
    }

    const matchday = await this.persistRoundFixtures(competition, fixtures, roundNumber - 1);
    return this.getMatchdayWithMatches(matchday.id);
  }

  private async persistRoundFixtures(
    competition: Competition,
    fixtures: ProviderFixture[],
    fallbackOrderIndex: number,
  ): Promise<Matchday> {
    const roundName = fixtures[0].round;
    const closesAt = fixtures.reduce(
      (min, fixture) => (fixture.kickoff < min ? fixture.kickoff : min),
      fixtures[0].kickoff,
    );

    const matchday = await this.prisma.matchday.upsert({
      where: {
        competitionId_season_name: {
          competitionId: competition.id,
          season: competition.currentSeason,
          name: roundName,
        },
      },
      update: { closesAt },
      create: {
        competitionId: competition.id,
        season: competition.currentSeason,
        name: roundName,
        order: parseRoundOrder(roundName, fallbackOrderIndex),
        closesAt,
        status: this.deriveInitialStatus(fixtures, closesAt),
      },
    });

    await Promise.all(fixtures.map((fixture) => this.upsertMatch(matchday.id, fixture)));

    return matchday;
  }

  /**
   * Estado inicial al crear una jornada nueva en BBDD. Necesario porque
   * `syncSpecificRound` tambien se usa para traer una jornada anterior que
   * ya se jugo por completo (nunca se sincronizo porque el seguimiento de la
   * competicion empezo despues): sin esto se crearia como OPEN aunque todos
   * sus partidos ya tengan resultado.
   */
  private deriveInitialStatus(fixtures: ProviderFixture[], closesAt: Date): MatchdayStatus {
    if (fixtures.every((fixture) => fixture.status === 'FINISHED')) {
      return 'FINISHED';
    }
    if (closesAt.getTime() <= Date.now()) {
      return 'CLOSED';
    }
    return 'OPEN';
  }

  private matchDataFromFixture(fixture: ProviderFixture) {
    return {
      homeTeam: fixture.homeTeam.name,
      awayTeam: fixture.awayTeam.name,
      homeTeamLogo: fixture.homeTeam.logoUrl,
      awayTeamLogo: fixture.awayTeam.logoUrl,
      kickoff: fixture.kickoff,
      status: fixture.status,
      homeScore: fixture.homeGoals,
      awayScore: fixture.awayGoals,
      result: computeMatchResult(fixture.homeGoals, fixture.awayGoals) as PredictionChoice | null,
    };
  }

  private async upsertMatch(matchdayId: string, fixture: ProviderFixture): Promise<void> {
    const data = this.matchDataFromFixture(fixture);
    await this.prisma.match.upsert({
      where: { externalId: fixture.fixtureId },
      update: data,
      create: { matchdayId, externalId: fixture.fixtureId, ...data },
    });
  }

  /** El partido ya existe siempre en este flujo (solo refrescamos resultado), no hace falta matchdayId. */
  private async updateMatchResult(fixture: ProviderFixture): Promise<void> {
    await this.prisma.match.update({
      where: { externalId: fixture.fixtureId },
      data: this.matchDataFromFixture(fixture),
    });
  }

  /** Cierra (bloquea predicciones) las jornadas cuya hora de cierre ya paso. Devuelve sus ids. */
  async closeDueMatchdays(now: Date = new Date()): Promise<string[]> {
    const candidates = await this.prisma.matchday.findMany({
      where: { status: { in: ['SCHEDULED', 'OPEN'] } },
    });

    const dueMatchdays = candidates.filter((matchday) => shouldCloseMatchday(matchday, now));

    await Promise.all(
      dueMatchdays.map((matchday) =>
        this.prisma.matchday.update({ where: { id: matchday.id }, data: { status: 'CLOSED' } }),
      ),
    );

    if (dueMatchdays.length > 0) {
      this.logger.log(`Jornadas cerradas: ${dueMatchdays.map((m) => m.id).join(', ')}`);
    }

    return dueMatchdays.map((m) => m.id);
  }

  /**
   * Refresca resultados de las jornadas cerradas y marca como FINISHED las
   * que ya tienen todos sus partidos terminados. Devuelve los ids de las
   * jornadas que acaban de pasar a FINISHED en esta llamada (para disparar
   * puntuacion, rankings, rachas, insignias y notificaciones).
   *
   * Junta los partidos pendientes de TODAS las jornadas cerradas en una sola
   * tanda de peticiones (ver FootballDataOrgProvider.getFixturesByIds), en
   * vez de una llamada por jornada: con el limite del plan gratuito, el
   * numero de peticiones importa mucho mas que el numero de partidos.
   * Tambien se salta partidos cuyo kickoff todavia no ha llegado, para no
   * gastar cupo preguntando por algo que seguro sigue "programado".
   */
  async syncResultsForClosedMatchdays(): Promise<string[]> {
    const closedMatchdays = await this.prisma.matchday.findMany({
      where: { status: 'CLOSED' },
      include: { matches: true },
    });
    if (closedMatchdays.length === 0) {
      return [];
    }

    const now = new Date();
    const pendingFixtureIds = closedMatchdays
      .flatMap((matchday) => matchday.matches)
      .filter((match) => match.status !== 'FINISHED' && match.kickoff.getTime() <= now.getTime())
      .map((match) => match.externalId);

    if (pendingFixtureIds.length > 0) {
      const fixtures = await this.footballProvider.getFixturesByIds(pendingFixtureIds);
      await Promise.all(fixtures.map((fixture) => this.updateMatchResult(fixture)));
    }

    const newlyFinished: string[] = [];
    for (const matchday of closedMatchdays) {
      const refreshedMatches = await this.prisma.match.findMany({
        where: { matchdayId: matchday.id },
      });
      const allFinished = refreshedMatches.every((m) => m.status === 'FINISHED');

      if (allFinished) {
        await this.prisma.matchday.update({
          where: { id: matchday.id },
          data: { status: 'FINISHED' },
        });
        newlyFinished.push(matchday.id);
      }
    }

    return newlyFinished;
  }

  async getMatchdayWithMatches(matchdayId: string) {
    const matchday = await this.prisma.matchday.findUnique({
      where: { id: matchdayId },
      include: { matches: { orderBy: { kickoff: 'asc' } }, competition: true },
    });
    if (!matchday) {
      throw new NotFoundException('Jornada no encontrada');
    }
    return matchday;
  }

  /** Jornada relevante "actual" de una competicion: la mas reciente no finalizada, o si no hay, la ultima finalizada. */
  async getCurrentMatchdayForCompetition(competitionId: string) {
    const open = await this.prisma.matchday.findFirst({
      where: { competitionId, status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] } },
      orderBy: { closesAt: 'asc' },
      include: { matches: { orderBy: { kickoff: 'asc' } } },
    });
    if (open) {
      return open;
    }

    return this.prisma.matchday.findFirst({
      where: { competitionId, status: 'FINISHED' },
      orderBy: { closesAt: 'desc' },
      include: { matches: { orderBy: { kickoff: 'asc' } } },
    });
  }

  /**
   * true si esta jornada es la "actual" de su competicion (ver
   * getCurrentMatchdayForCompetition). Se usa para no dejar enviar
   * pronosticos en una jornada futura que se sincronizo solo para
   * previsualizarla (navegacion "siguiente"): predecir toca cuando le llegue
   * el turno, no antes — si no, la app pierde el motivo para abrirla cada
   * semana.
   */
  async isCurrentMatchday(matchdayId: string): Promise<boolean> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday || matchday.status === 'FINISHED') {
      return false;
    }

    const earlierPending = await this.prisma.matchday.findFirst({
      where: {
        competitionId: matchday.competitionId,
        status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] },
        closesAt: { lt: matchday.closesAt },
      },
    });
    return !earlierPending;
  }
}
