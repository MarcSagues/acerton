import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Competition, Matchday, MatchdayStatus, PredictionChoice } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  FOOTBALL_PROVIDER,
  FootballProvider,
  ProviderFixture,
} from '../football-data/football-provider.interface';
import {
  computeMatchResult,
  isKickoffTimeUnconfirmed,
  isMatchPredictable,
  parseRoundOrder,
  shouldCloseMatchday,
} from './matchday.util';

/**
 * Ya NO limita cuando se aceptan pronosticos (ver canAcceptPredictions): solo
 * se usa para calcular el `opensAt` nominal que se sigue enviando por
 * compatibilidad con versiones antiguas de la app.
 */
export const PREDICTIONS_OPEN_BEFORE_MS = 4 * 24 * 60 * 60 * 1000;

/** Ver MatchdaysService.getOrders. */
interface MatchdayOrders {
  referenceOrder: number | null;
  predictLimitOrder: number | null;
}

export interface SyncResultsOutcome {
  /** Jornadas CLOSED cuyos partidos han terminado todos en esta tanda: listas para puntuar del todo (rachas, insignias, notificacion de cierre incluidas). */
  newlyFinished: string[];
  /** Resto de jornadas CLOSED evaluadas esta tanda (algun partido acabado o ninguno todavia): solo puntuacion/clasificacion provisional, sin rachas/insignias/notificaciones. */
  inProgress: string[];
}

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
      throw new NotFoundException('Competición no encontrada');
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
   * Vuelve a pedir al proveedor los partidos por jugar cuya hora todavia es
   * provisional (ver isKickoffTimeUnconfirmed) y corrige su kickoff, y el cierre
   * de la jornada si cambia el primer partido. Hace falta porque syncCurrentRound
   * no vuelve a pedir una jornada ya importada (ahorro deliberado de cupo): sin
   * esto, la hora provisional con la que entro un partido se quedaba para siempre
   * aunque el proveedor la confirmara despues (2026-10-05: toda una jornada de La
   * Liga a las 2:00). Solo gasta cupo mientras haya horas por confirmar: una
   * peticion por cada 20 partidos. Devuelve cuantos partidos cambiaron de hora.
   */
  async refreshUnconfirmedKickoffs(now = new Date()): Promise<number> {
    const candidates = await this.prisma.match.findMany({
      where: {
        status: 'SCHEDULED',
        kickoff: { gt: now },
        matchday: { status: { in: ['SCHEDULED', 'OPEN'] } },
      },
      select: { externalId: true, matchdayId: true, kickoff: true },
    });
    const unconfirmed = candidates.filter((match) => isKickoffTimeUnconfirmed(match.kickoff));
    if (unconfirmed.length === 0) {
      return 0;
    }

    const fixtures = await this.footballProvider.getFixturesByIds(
      unconfirmed.map((match) => match.externalId),
    );
    const matchdaysToRefresh = new Set<string>();
    let changed = 0;
    for (const fixture of fixtures) {
      const known = unconfirmed.find((match) => match.externalId === fixture.fixtureId);
      if (!known || fixture.kickoff.getTime() === known.kickoff.getTime()) {
        continue;
      }
      await this.updateMatchResult(fixture);
      matchdaysToRefresh.add(known.matchdayId);
      changed += 1;
    }

    for (const matchdayId of matchdaysToRefresh) {
      const first = await this.prisma.match.findFirst({
        where: { matchdayId },
        orderBy: { kickoff: 'asc' },
        select: { kickoff: true },
      });
      if (first) {
        await this.prisma.matchday.update({
          where: { id: matchdayId },
          data: { closesAt: first.kickoff },
        });
      }
    }
    return changed;
  }

  /**
   * Rellena el nombre corto de los equipos de partidos ya guardados antes de que
   * se guardara (columnas homeTeamShort/awayTeamShort a null): primero los mas
   * recientes, `limit` por pasada (una peticion por cada 20) para no gastar cupo.
   * Desde que se guarda al importar, solo hace falta para lo que ya habia. Devuelve
   * cuantos partidos se han rellenado.
   */
  async backfillTeamShortNames(limit = 40): Promise<number> {
    const missing = await this.prisma.match.findMany({
      where: { OR: [{ homeTeamShort: null }, { awayTeamShort: null }] },
      orderBy: { kickoff: 'desc' },
      take: limit,
      select: { externalId: true },
    });
    if (missing.length === 0) {
      return 0;
    }

    const fixtures = await this.footballProvider.getFixturesByIds(
      missing.map((match) => match.externalId),
    );
    for (const fixture of fixtures) {
      await this.updateMatchResult(fixture);
    }
    return fixtures.length;
  }

  /**
   * true si alguna jornada pendiente de la competicion todavia tiene un
   * partido por empezar (SCHEDULED y con kickoff futuro): hay algo que
   * pronosticar ahora mismo. Una sola consulta de conteo, pensada para
   * ejecutarse a menudo (ver JobsService.ensureUpcomingMatchdays).
   */
  async hasPredictableMatch(competitionId: string): Promise<boolean> {
    const upcoming = await this.prisma.match.count({
      where: {
        status: 'SCHEDULED',
        kickoff: { gt: new Date() },
        matchday: { competitionId, status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] } },
      },
    });
    return upcoming > 0;
  }

  /**
   * Garantiza, en la medida en que el proveedor lo permita, que haya una
   * jornada con algo por pronosticar (2026-10-04, peticion explicita: "siempre
   * debe haber una jornada abierta"). Devuelve true si tras la llamada hay
   * partidos por empezar. Casos:
   * - Ya los hay: no hace nada (ni consulta al proveedor).
   * - No queda ninguna jornada pendiente (la anterior acaba de terminar): trae
   *   la jornada en curso del proveedor, igual que syncCurrentRound.
   * - Queda una jornada pendiente pero solo con partidos ya empezados (los
   *   ultimos estan en juego) o el proveedor aun no ha pasado a la
   *   siguiente: pide ya la siguiente por numero en vez de esperar a que la
   *   actual termine del todo. Solo en rondas numeradas de liga regular (ver
   *   syncSpecificRound): en eliminatorias no se adivina el numero.
   */
  async ensureUpcomingMatchday(competitionId: string): Promise<boolean> {
    if (await this.hasPredictableMatch(competitionId)) {
      return true;
    }
    const competition = await this.prisma.competition.findUnique({ where: { id: competitionId } });
    if (!competition) {
      return false;
    }

    const hasPending = await this.prisma.matchday.findFirst({
      where: {
        competitionId,
        season: competition.currentSeason,
        status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] },
      },
      select: { id: true },
    });
    if (!hasPending) {
      await this.syncCurrentRound(competitionId);
      if (await this.hasPredictableMatch(competitionId)) {
        return true;
      }
    }

    const latest = await this.prisma.matchday.findFirst({
      where: { competitionId, season: competition.currentSeason },
      orderBy: { order: 'desc' },
    });
    if (!latest || parseRoundOrder(latest.name, -1) !== latest.order) {
      return false;
    }
    await this.syncSpecificRound(competitionId, latest.order + 1);
    return this.hasPredictableMatch(competitionId);
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
      throw new NotFoundException('Competición no encontrada');
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
      // Si el proveedor no da nombre corto se guarda el completo: asi el partido
      // deja de contar como "pendiente de traer" para backfillTeamShortNames.
      homeTeamShort: fixture.homeTeam.shortName ?? fixture.homeTeam.name,
      awayTeamShort: fixture.awayTeam.shortName ?? fixture.awayTeam.name,
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
  async syncResultsForClosedMatchdays(): Promise<SyncResultsOutcome> {
    const closedMatchdays = await this.prisma.matchday.findMany({
      where: { status: 'CLOSED' },
      include: { matches: true },
    });
    if (closedMatchdays.length === 0) {
      return { newlyFinished: [], inProgress: [] };
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
    const inProgress: string[] = [];
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
      } else {
        inProgress.push(matchday.id);
      }
    }

    return { newlyFinished, inProgress };
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
   * Ordenes que fijan que jornada se muestra y cual admite pronosticos, entre
   * las no finalizadas de una competicion. Una sola consulta para los dos.
   *
   * - `referenceOrder`: la jornada con el proximo partido SIN TERMINAR mas
   *   cercano en el tiempo (la "actual" que se muestra por defecto). Null si
   *   no queda ninguna pendiente. Decision explicita del usuario
   *   (2026-09-19, ver decisions.md): sustituye un calculo anterior basado
   *   en `matchday.closesAt` (el kickoff del PRIMER partido de la ronda,
   *   fijado al crearla) — ese campo no se mueve cuando se aplaza un partido
   *   que NO es el primero de la jornada, asi que una jornada con 9 de 10
   *   partidos ya jugados y el ultimo aplazado un mes seguia "ganando" por
   *   tener el closesAt mas antiguo (caso real visto en datos de
   *   desarrollo). Aqui se recalcula sobre los partidos de verdad: en cuanto
   *   todos los de una jornada tienen resultado pasa a FINISHED y deja de
   *   competir por esta posicion.
   * - `predictLimitOrder`: hasta que jornada (inclusive) se admiten
   *   pronosticos. Es la de referencia, salvo cuando a esa ya no le queda
   *   ningun partido por empezar (los ultimos estan en juego y la jornada aun
   *   no esta FINISHED): entonces tambien se admite la jornada del proximo
   *   partido que SI esta por empezar. Sin esto, durante esas horas no habria
   *   ninguna jornada abierta para pronosticar (2026-10-04, peticion
   *   explicita: "siempre debe haber una jornada abierta"). Nunca es menor
   *   que `referenceOrder`.
   */
  private async getOrders(competitionId: string): Promise<MatchdayOrders> {
    const pending = await this.prisma.matchday.findMany({
      where: { competitionId, status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] } },
      select: {
        order: true,
        matches: {
          where: { status: { not: 'FINISHED' } },
          select: { kickoff: true, status: true },
          orderBy: { kickoff: 'asc' },
        },
      },
    });

    const now = new Date();
    let reference: { order: number; kickoff: Date } | null = null;
    let nextUpcoming: { order: number; kickoff: Date } | null = null;
    for (const matchday of pending) {
      const nextKickoff = matchday.matches[0]?.kickoff;
      if (nextKickoff && (!reference || nextKickoff.getTime() < reference.kickoff.getTime())) {
        reference = { order: matchday.order, kickoff: nextKickoff };
      }
      const upcoming = matchday.matches.find((match) => isMatchPredictable(match, now));
      if (
        upcoming &&
        (!nextUpcoming || upcoming.kickoff.getTime() < nextUpcoming.kickoff.getTime())
      ) {
        nextUpcoming = { order: matchday.order, kickoff: upcoming.kickoff };
      }
    }

    return {
      referenceOrder: reference?.order ?? null,
      predictLimitOrder: reference
        ? Math.max(reference.order, nextUpcoming?.order ?? reference.order)
        : null,
    };
  }

  /**
   * Jornada relevante "actual" de una competicion para mostrar por defecto:
   * la de la orden de referencia (ver getOrders, el proximo partido sin
   * terminar mas cercano), o si no hay ninguna pendiente, la ultima
   * finalizada. Si un partido de una jornada se aplaza mucho, esa jornada
   * deja de ser "la actual" a mostrar/puntuar y pasa a serlo la siguiente
   * cuyo partido este mas cerca en el tiempo — la aplazada no desaparece,
   * sigue aceptando pronosticos (ver canAcceptPredictions), solo deja de
   * ser la que se ve por defecto al abrir la app. Cuando se acerque de
   * nuevo su fecha real, puede volver a ser "la actual".
   */
  async getCurrentMatchdayForCompetition(competitionId: string) {
    const orders = await this.getOrders(competitionId);
    if (orders.referenceOrder !== null) {
      const open = await this.prisma.matchday.findFirst({
        where: { competitionId, order: orders.referenceOrder },
        include: { matches: { orderBy: { kickoff: 'asc' } } },
      });
      if (open) {
        // Ya lo tenemos calculado: sin esto attachCanPredict lo volveria a
        // pedir (otras dos consultas en serie por cada llamada).
        return this.attachCanPredict(open, orders);
      }
    }

    const finished = await this.prisma.matchday.findFirst({
      where: { competitionId, status: 'FINISHED' },
      orderBy: { closesAt: 'desc' },
      include: { matches: { orderBy: { kickoff: 'asc' } } },
    });
    return finished ? this.attachCanPredict(finished) : null;
  }

  /**
   * Añade `canPredict` y `opensAt` a una jornada ya cargada, para que el
   * frontend sepa si sus partidos todavia no bloqueados por horario se
   * pueden predecir sin tener que replicar la regla de canAcceptPredictions
   * el mismo. `canPredict` es la regla completa (ver canAcceptPredictions):
   * ya no hay ventana horaria de apertura, la jornada que le toca esta
   * abierta desde el momento en que le toca.
   *
   * `opensAt` se mantiene SOLO por compatibilidad con versiones de la app ya
   * instaladas, que todavia bloquean en cliente mientras `opensAt` este en el
   * futuro: cuando la jornada admite pronosticos se devuelve nunca posterior
   * a ahora. Las versiones nuevas ya no lo leen.
   */
  private async attachCanPredict<
    T extends { order: number; status: string; competitionId: string; closesAt: Date },
  >(
    matchday: T,
    /** Si quien llama ya calculo getOrders para esta competicion, se evita repetirlo. */
    knownOrders?: MatchdayOrders,
  ): Promise<T & { canPredict: boolean; opensAt: string }> {
    const nominalOpensAt = matchday.closesAt.getTime() - PREDICTIONS_OPEN_BEFORE_MS;
    if (matchday.status === 'FINISHED') {
      return { ...matchday, canPredict: false, opensAt: new Date(nominalOpensAt).toISOString() };
    }
    const { predictLimitOrder } = knownOrders ?? (await this.getOrders(matchday.competitionId));
    const canPredict = predictLimitOrder === null || matchday.order <= predictLimitOrder;
    return {
      ...matchday,
      canPredict,
      opensAt: new Date(
        canPredict ? Math.min(nominalOpensAt, Date.now()) : nominalOpensAt,
      ).toISOString(),
    };
  }

  /**
   * true si esta jornada puede recibir pronosticos: es la jornada "actual"
   * de su competicion (ver getOrders, la del proximo partido sin terminar
   * mas cercano), una anterior en el orden de rondas, o la siguiente cuando
   * a la actual ya no le queda ningun partido por empezar. Lo de "anterior"
   * cubre el caso de una jornada con numero mas bajo que la actual pero que
   * se juega mas tarde por un aplazamiento — no es una jornada "futura" que
   * se este intentando rellenar antes de tiempo, sino una que se quedo
   * atras; bloquearla solo confundiria al usuario sin aportar nada. Lo que
   * si se bloquea es una jornada mas alta que esas (navegacion "siguiente"
   * antes de que le toque), para no rellenar varias semanas de golpe.
   *
   * Ya NO hay ventana horaria de apertura (antes: no se aceptaba nada hasta
   * 4 dias antes del primer partido, PREDICTIONS_OPEN_BEFORE_MS). Decision
   * explicita del usuario (2026-10-04, ver decisions.md): siempre debe haber
   * una jornada abierta para pronosticar, la mas proxima, aunque falten
   * semanas (parones de selecciones, etc.).
   */
  async canAcceptPredictions(matchdayId: string): Promise<boolean> {
    const matchday = await this.prisma.matchday.findUnique({ where: { id: matchdayId } });
    if (!matchday) {
      return false;
    }
    const decorated = await this.attachCanPredict(matchday);
    return decorated.canPredict;
  }

  /**
   * Todas las jornadas ya guardadas en BBDD de una competicion (no se
   * sincroniza nada nuevo contra el proveedor: es solo para el selector de
   * jornada, no para traer partidos), con los puntos que un usuario concreto
   * se llevo en cada una dentro de un grupo — null si esa jornada todavia no
   * tiene ningun pronostico suyo (futura, o se unio despues).
   */
  async listForCompetitionWithUserPoints(competitionId: string, userId: string, groupId: string) {
    const matchdays = await this.prisma.matchday.findMany({
      where: { competitionId },
      orderBy: { order: 'asc' },
    });
    if (matchdays.length === 0) {
      return [];
    }

    const matchdayIds = matchdays.map((m) => m.id);
    const predictions = await this.prisma.prediction.findMany({
      where: { userId, groupId, match: { matchdayId: { in: matchdayIds } } },
      select: { pointsEarned: true, match: { select: { matchdayId: true } } },
    });

    const pointsByMatchday = new Map<string, number>();
    for (const prediction of predictions) {
      const matchdayId = prediction.match.matchdayId;
      pointsByMatchday.set(
        matchdayId,
        (pointsByMatchday.get(matchdayId) ?? 0) + (prediction.pointsEarned ?? 0),
      );
    }

    return matchdays.map((matchday) => ({
      id: matchday.id,
      order: matchday.order,
      status: matchday.status,
      closesAt: matchday.closesAt,
      points: pointsByMatchday.has(matchday.id) ? pointsByMatchday.get(matchday.id)! : null,
    }));
  }
}
