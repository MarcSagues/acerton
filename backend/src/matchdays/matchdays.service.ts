import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Matchday, PredictionChoice } from '@prisma/client';
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

    const roundName = fixtures[0].round;
    const existingCount = await this.prisma.matchday.count({ where: { competitionId } });
    const closesAt = fixtures.reduce(
      (min, fixture) => (fixture.kickoff < min ? fixture.kickoff : min),
      fixtures[0].kickoff,
    );

    const matchday = await this.prisma.matchday.upsert({
      where: {
        competitionId_season_name: {
          competitionId,
          season: competition.currentSeason,
          name: roundName,
        },
      },
      update: { closesAt },
      create: {
        competitionId,
        season: competition.currentSeason,
        name: roundName,
        order: parseRoundOrder(roundName, existingCount),
        closesAt,
        status: 'OPEN',
      },
    });

    await Promise.all(fixtures.map((fixture) => this.upsertMatch(matchday.id, fixture)));

    return matchday;
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
}
