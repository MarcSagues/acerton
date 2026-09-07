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
    return this.attachCanPredict(matchday);
  }

  /**
   * Jornada relevante "actual" de una competicion para mostrar por defecto:
   * la de numero de ronda mas bajo entre las no finalizadas, o si no hay
   * ninguna, la ultima finalizada. Se ordena por `order` y no por
   * `closesAt` porque un partido aplazado puede hacer que una jornada
   * anterior (ej. la 5) cierre despues que la siguiente (la 6) — closesAt
   * marcaria la 6 como "actual" aunque la 5 todavia no se haya jugado, que
   * es justo lo contrario de lo que se espera ver al abrir la app.
   */
  async getCurrentMatchdayForCompetition(competitionId: string) {
    const open = await this.prisma.matchday.findFirst({
      where: { competitionId, status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] } },
      orderBy: { order: 'asc' },
      include: { matches: { orderBy: { kickoff: 'asc' } } },
    });
    if (open) {
      return this.attachCanPredict(open);
    }

    const finished = await this.prisma.matchday.findFirst({
      where: { competitionId, status: 'FINISHED' },
      orderBy: { closesAt: 'desc' },
      include: { matches: { orderBy: { kickoff: 'asc' } } },
    });
    return finished ? this.attachCanPredict(finished) : null;
  }

  /**
   * Orden de la jornada "actual" por cierre mas proximo (ver
   * canAcceptPredictions) — null si no queda ninguna pendiente.
   */
  private async getEarliestPendingOrder(competitionId: string): Promise<number | null> {
    const current = await this.prisma.matchday.findFirst({
      where: { competitionId, status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] } },
      orderBy: { closesAt: 'asc' },
    });
    return current?.order ?? null;
  }

  /**
   * Añade `canPredict` a una jornada ya cargada, para que el frontend sepa
   * si sus partidos todavia no bloqueados por horario se pueden predecir sin
   * tener que replicar la regla de canAcceptPredictions comparando ordenes
   * el mismo (eso fue justo lo que causo que la jornada "actual" para
   * mostrar por defecto — la de numero mas bajo — y la jornada limite para
   * predecir — la de cierre mas proximo — se confundieran entre si).
   */
  private async attachCanPredict<T extends { order: number; status: string; competitionId: string }>(
    matchday: T,
  ): Promise<T & { canPredict: boolean }> {
    if (matchday.status === 'FINISHED') {
      return { ...matchday, canPredict: false };
    }
    const earliestPendingOrder = await this.getEarliestPendingOrder(matchday.competitionId);
    return { ...matchday, canPredict: earliestPendingOrder === null || matchday.order <= earliestPendingOrder };
  }

  /**
   * true si esta jornada ya deberia poder recibir pronosticos: es la jornada
   * "actual" de su competicion (ver getCurrentMatchdayForCompetition, la de
   * cierre mas proximo) o una anterior en el orden de rondas. Esto ultimo
   * cubre el caso de una jornada con numero mas bajo que la actual pero que
   * se juega mas tarde por un aplazamiento — no es una jornada "futura" que
   * se este intentando rellenar antes de tiempo, sino una que se quedo
   * atras; bloquearla solo confundiria al usuario sin aportar nada. Lo que
   * si se bloquea es una jornada con numero mas alto que la actual
   * (navegacion "siguiente" antes de que le toque) — eso es lo que evitaria
   * rellenar varias semanas de golpe y le quitaria a la app el motivo para
   * abrirla cada semana.
   */
  async canAcceptPredictions(matchdayId: string): Promise<boolean> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      return false;
    }
    return (await this.attachCanPredict(matchday)).canPredict;
  }
}
