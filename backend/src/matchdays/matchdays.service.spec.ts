import { MatchdaysService } from './matchdays.service';

function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    matchday: {
      // Por defecto sin jornadas pendientes (getReferenceOrder las necesita
      // en forma de array): los tests que sí les interesa el resultado de
      // getReferenceOrder/attachCanPredict lo sobrescriben explícitamente.
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    match: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    competition: {
      findUnique: jest.fn(),
    },
    prediction: {
      findMany: jest.fn(),
    },
    ...overrides,
  };
}

describe('MatchdaysService.closeDueMatchdays', () => {
  it('cierra solo las jornadas cuyo cierre ya paso y deja las demas intactas', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'due-1', status: 'OPEN', closesAt: new Date('2026-03-05T19:00:00Z') },
      { id: 'due-2', status: 'SCHEDULED', closesAt: new Date('2026-03-05T20:00:00Z') },
      { id: 'not-due', status: 'OPEN', closesAt: new Date('2026-03-05T21:00:00Z') },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    const closedIds = await service.closeDueMatchdays(now);

    expect(closedIds.sort()).toEqual(['due-1', 'due-2']);
    expect(prisma.matchday.update).toHaveBeenCalledTimes(2);
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'due-1' },
      data: { status: 'CLOSED' },
    });
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'due-2' },
      data: { status: 'CLOSED' },
    });
  });

  it('no actualiza nada si ninguna jornada ha llegado a su cierre', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'not-due', status: 'OPEN', closesAt: new Date('2026-03-05T21:00:00Z') },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    const closedIds = await service.closeDueMatchdays(now);

    expect(closedIds).toEqual([]);
    expect(prisma.matchday.update).not.toHaveBeenCalled();
  });
});

describe('MatchdaysService.syncCurrentRound (ahorro de cupo de API)', () => {
  it('no llama al proveedor si ya hay una jornada vigente para la temporada actual', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      currentSeason: 2025,
      externalId: 39,
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'md-1', status: 'OPEN' });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesByIds: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.syncCurrentRound('c1');

    expect(result).toEqual({ id: 'md-1', status: 'OPEN' });
    expect(footballProvider.getCurrentRoundFixtures).not.toHaveBeenCalled();
  });

  it('llama al proveedor si no hay ninguna jornada vigente (nueva o recien terminada la anterior)', async () => {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      currentSeason: 2025,
      externalId: 39,
    });
    prisma.matchday.findFirst.mockResolvedValue(null);
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn().mockResolvedValue([]),
      getFixturesByIds: jest.fn(),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    await service.syncCurrentRound('c1');

    expect(footballProvider.getCurrentRoundFixtures).toHaveBeenCalledWith(39, 2025);
  });
});

describe('MatchdaysService.getAdjacentMatchday', () => {
  function byId(rows: Record<string, unknown>) {
    return jest.fn(({ where }: { where: { id: string } }) =>
      Promise.resolve(rows[where.id] ?? null),
    );
  }

  it('anterior: devuelve la jornada con el order inmediatamente menor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      previous: {
        id: 'previous',
        competitionId: 'c1',
        order: 4,
        matches: [],
        closesAt: new Date(),
      },
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'previous' });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'previous');

    expect(result).toMatchObject({ id: 'previous' });
    expect(prisma.matchday.findFirst).toHaveBeenCalledWith({
      where: { competitionId: 'c1', order: { lt: 5 } },
      orderBy: { order: 'desc' },
    });
  });

  it('anterior: null si ya es la primera jornada de la competicion', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 1 },
    });
    prisma.matchday.findFirst.mockResolvedValue(null);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'previous');

    expect(result).toBeNull();
  });

  it('anterior: si no esta sincronizada y no es la primera, la sincroniza bajo demanda pidiendo order-1 al proveedor, y la crea como FINISHED si ya se jugo', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 6 },
      'new-md': { id: 'new-md', competitionId: 'c1', order: 5, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue(null); // no hay anterior ya sincronizada
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    prisma.matchday.upsert.mockResolvedValue({ id: 'new-md' });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesForRound: jest.fn().mockResolvedValue([
        {
          fixtureId: 1,
          round: 'Regular Season - 5',
          kickoff: new Date('2026-02-01T20:00:00Z'),
          homeTeam: { name: 'A', logoUrl: null },
          awayTeam: { name: 'B', logoUrl: null },
          status: 'FINISHED',
          homeGoals: 2,
          awayGoals: 1,
        },
      ]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'previous');

    expect(footballProvider.getFixturesForRound).toHaveBeenCalledWith(39, 2026, 5);
    expect(result).toMatchObject({ id: 'new-md' });
    expect(prisma.matchday.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'FINISHED' }),
      }),
    );
  });

  it('siguiente: si ya existe en BBDD, la devuelve sin llamar al proveedor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      next: { id: 'next', competitionId: 'c1', order: 6, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue({ id: 'next' });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'next');

    expect(result).toMatchObject({ id: 'next' });
    expect(footballProvider.getFixturesForRound).not.toHaveBeenCalled();
  });

  it('siguiente: si no existe todavia, la sincroniza bajo demanda pidiendo order+1 al proveedor', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
      'new-md': { id: 'new-md', competitionId: 'c1', order: 6, matches: [], closesAt: new Date() },
    });
    prisma.matchday.findFirst.mockResolvedValue(null); // no hay siguiente ya sincronizada
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    prisma.matchday.upsert.mockResolvedValue({ id: 'new-md' });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesForRound: jest.fn().mockResolvedValue([
        {
          fixtureId: 1,
          round: 'Regular Season - 6',
          kickoff: new Date('2026-04-01T20:00:00Z'),
          homeTeam: { name: 'A', logoUrl: null },
          awayTeam: { name: 'B', logoUrl: null },
          status: 'SCHEDULED',
          homeGoals: null,
          awayGoals: null,
        },
      ]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'next');

    expect(footballProvider.getFixturesForRound).toHaveBeenCalledWith(39, 2026, 6);
    expect(result).toMatchObject({ id: 'new-md' });
  });

  it('siguiente: null si el proveedor no devuelve nada para esa jornada todavia', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique = byId({
      current: { id: 'current', competitionId: 'c1', order: 5 },
    });
    prisma.matchday.findFirst.mockResolvedValue(null);
    prisma.competition.findUnique.mockResolvedValue({
      id: 'c1',
      externalId: 39,
      currentSeason: 2026,
    });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesForRound: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.getAdjacentMatchday('current', 'next');

    expect(result).toBeNull();
    expect(prisma.matchday.upsert).not.toHaveBeenCalled();
  });
});

describe('MatchdaysService.getCurrentMatchdayForCompetition', () => {
  it('elige la jornada del proximo partido sin terminar mas cercano, no la de numero mas bajo', async () => {
    // Escenario real (decision explicita del usuario, sustituye la regla
    // anterior): un partido de la jornada 6 (order 6) se aplaza 30 dias,
    // asi que su unico partido pendiente cae mucho mas lejos que el de la
    // jornada 7 (order 7, partido pendiente en 3 dias) — debe mostrarse la 7
    // como "actual", no la 6. La 6 no desaparece: sigue pudiendo aceptar
    // pronosticos (ver canAcceptPredictions), solo deja de ser la que se ve
    // por defecto.
    const now = Date.now();
    const in3Days = new Date(now + 3 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now + 30 * 24 * 60 * 60 * 1000);
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { order: 6, matches: [{ kickoff: in30Days }] },
      { order: 7, matches: [{ kickoff: in3Days }] },
    ]);
    prisma.matchday.findFirst.mockResolvedValue({
      id: 'jornada-7',
      order: 7,
      closesAt: new Date(),
    });

    const service = new MatchdaysService(prisma as never, {} as never);
    const result = await service.getCurrentMatchdayForCompetition('c1');

    expect(result).toMatchObject({ id: 'jornada-7' });
    expect(prisma.matchday.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { competitionId: 'c1', order: 7 } }),
    );
  });

  it('calcula la jornada de referencia una sola vez por llamada (no la repite al decorar con canPredict)', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { order: 7, matches: [{ kickoff: new Date(Date.now() + 3600_000) }] },
    ]);
    prisma.matchday.findFirst.mockResolvedValue({
      id: 'jornada-7',
      order: 7,
      status: 'OPEN',
      competitionId: 'c1',
      closesAt: new Date(),
    });

    const service = new MatchdaysService(prisma as never, {} as never);
    const result = await service.getCurrentMatchdayForCompetition('c1');

    expect(result).toMatchObject({ id: 'jornada-7', canPredict: true });
    // Cada llamada de mas a getReferenceOrder son dos consultas en serie a la BD.
    expect(prisma.matchday.findMany).toHaveBeenCalledTimes(1);
  });

  it('opensAt nunca es posterior a ahora cuando la jornada admite pronosticos (compatibilidad con apps ya instaladas)', async () => {
    // Las versiones antiguas de la app siguen bloqueando en cliente mientras
    // opensAt este en el futuro; sin esto seguirian viendo "Próxima · abre en".
    const prisma = buildPrismaMock();
    const inTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    prisma.matchday.findMany.mockResolvedValue([
      { order: 8, matches: [{ kickoff: inTwoWeeks, status: 'SCHEDULED' }] },
    ]);
    prisma.matchday.findFirst.mockResolvedValue({
      id: 'jornada-8',
      order: 8,
      status: 'OPEN',
      competitionId: 'c1',
      closesAt: inTwoWeeks,
    });

    const service = new MatchdaysService(prisma as never, {} as never);
    const result = await service.getCurrentMatchdayForCompetition('c1');

    expect(result?.canPredict).toBe(true);
    expect(new Date(result!.opensAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('si todas estan finalizadas, devuelve la ultima jugada', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([]); // no hay ninguna pendiente
    prisma.matchday.findFirst.mockResolvedValue({ id: 'jornada-4', closesAt: new Date() });

    const service = new MatchdaysService(prisma as never, {} as never);
    const result = await service.getCurrentMatchdayForCompetition('c1');

    expect(result).toMatchObject({ id: 'jornada-4' });
  });
});

describe('MatchdaysService.canAcceptPredictions', () => {
  it('false si la jornada ya esta FINISHED', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md1',
      status: 'FINISHED',
      closesAt: new Date(),
    });
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md1')).toBe(false);
  });

  it('false si su numero de jornada es mayor que el de la actual (previsualizacion "siguiente")', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-next',
      competitionId: 'c1',
      status: 'OPEN',
      order: 7,
      closesAt: new Date(),
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 6, matches: [{ kickoff: new Date() }] }, // la jornada 6 sigue siendo la actual
    ]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-next')).toBe(false);
  });

  it('true si su numero de jornada es menor que el de la actual (se quedo atras por un aplazamiento, no es "futura")', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-behind',
      competitionId: 'c1',
      status: 'OPEN',
      order: 5,
      closesAt: new Date(),
    });
    // El proximo partido sin terminar de la jornada 6 es mas cercano que el
    // de la 5 (que se aplazo), pero eso no hace "futura" a la 5.
    prisma.matchday.findMany.mockResolvedValue([{ order: 6, matches: [{ kickoff: new Date() }] }]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-behind')).toBe(true);
  });

  it('true si es ella misma la jornada actual', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: new Date(),
    });
    prisma.matchday.findMany.mockResolvedValue([{ order: 6, matches: [{ kickoff: new Date() }] }]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });

  it('true si no hay ninguna jornada pendiente en su competicion', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: new Date(),
    });
    prisma.matchday.findMany.mockResolvedValue([]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });

  it('true si su unico partido pendiente esta muy lejos pero los demas de la competicion ya terminaron (no se queda "congelada" en el pasado)', async () => {
    // Escenario real de dev (2026-09-19): la jornada 6 de La Liga tiene 9 de
    // 10 partidos ya jugados y el ultimo aplazado un mes — su `closesAt`
    // (kickoff del primer partido, ya muy pasado) no debe hacerla "ganar"
    // frente a la jornada 7, cuyos partidos son inminentes.
    const prisma = buildPrismaMock();
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'jornada-7',
      competitionId: 'c1',
      status: 'CLOSED',
      order: 7,
      closesAt: new Date('2026-09-18T19:00:00Z'), // pasado, pero mas reciente que el de la 6
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 6, matches: [{ kickoff: in30Days }] }, // unico partido pendiente: el aplazado
      { order: 7, matches: [{ kickoff: in3Days }] },
    ]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('jornada-7')).toBe(true);
  });

  it('true aunque su primer partido este a mas de 4 dias: la jornada mas proxima siempre esta abierta', async () => {
    // Decision explicita del usuario (2026-10-04): antes no se aceptaba nada
    // hasta 4 dias antes del primer partido; ahora la jornada que le toca esta
    // abierta desde el momento en que le toca (p.ej. durante un parón).
    const prisma = buildPrismaMock();
    const inSixDays = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: inSixDays,
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 6, matches: [{ kickoff: inSixDays, status: 'SCHEDULED' }] },
    ]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });

  it('true tambien con el primer partido a semanas vista (parón de selecciones)', async () => {
    const prisma = buildPrismaMock();
    const inThreeWeeks = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-next-round',
      competitionId: 'c1',
      status: 'OPEN',
      order: 8,
      closesAt: inThreeWeeks,
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 8, matches: [{ kickoff: inThreeWeeks, status: 'SCHEDULED' }] },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    expect(await service.canAcceptPredictions('md-next-round')).toBe(true);
  });

  it('true para la siguiente jornada cuando a la actual ya no le queda ningun partido por empezar', async () => {
    // El ultimo partido de la jornada 7 esta en juego (la jornada aun no esta
    // FINISHED): sin esta regla no habria ninguna jornada abierta durante esas horas.
    const prisma = buildPrismaMock();
    const inFourDays = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'jornada-8',
      competitionId: 'c1',
      status: 'OPEN',
      order: 8,
      closesAt: inFourDays,
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 7, matches: [{ kickoff: new Date(Date.now() - 30 * 60 * 1000), status: 'LIVE' }] },
      { order: 8, matches: [{ kickoff: inFourDays, status: 'SCHEDULED' }] },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    expect(await service.canAcceptPredictions('jornada-8')).toBe(true);
  });

  it('false para la siguiente jornada mientras a la actual le quede algun partido por empezar', async () => {
    const prisma = buildPrismaMock();
    const inOneDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const inFourDays = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'jornada-8',
      competitionId: 'c1',
      status: 'OPEN',
      order: 8,
      closesAt: inFourDays,
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 7, matches: [{ kickoff: inOneDay, status: 'SCHEDULED' }] },
      { order: 8, matches: [{ kickoff: inFourDays, status: 'SCHEDULED' }] },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    expect(await service.canAcceptPredictions('jornada-8')).toBe(false);
  });

  it('false para dos jornadas por delante aunque la siguiente ya este abierta (no se rellenan semanas de golpe)', async () => {
    const prisma = buildPrismaMock();
    const inFourDays = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000);
    const inElevenDays = new Date(Date.now() + 11 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'jornada-9',
      competitionId: 'c1',
      status: 'OPEN',
      order: 9,
      closesAt: inElevenDays,
    });
    prisma.matchday.findMany.mockResolvedValue([
      { order: 7, matches: [{ kickoff: new Date(Date.now() - 30 * 60 * 1000), status: 'LIVE' }] },
      { order: 8, matches: [{ kickoff: inFourDays, status: 'SCHEDULED' }] },
      { order: 9, matches: [{ kickoff: inElevenDays, status: 'SCHEDULED' }] },
    ]);

    const service = new MatchdaysService(prisma as never, {} as never);
    expect(await service.canAcceptPredictions('jornada-9')).toBe(false);
  });

  it('true si su primer partido esta a menos de 4 dias', async () => {
    const prisma = buildPrismaMock();
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-current',
      competitionId: 'c1',
      status: 'OPEN',
      order: 6,
      closesAt: inTwoDays,
    });
    prisma.matchday.findMany.mockResolvedValue([{ order: 6, matches: [{ kickoff: inTwoDays }] }]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    expect(await service.canAcceptPredictions('md-current')).toBe(true);
  });
});

describe('MatchdaysService.syncResultsForClosedMatchdays (una sola tanda de peticiones)', () => {
  it('no llama al proveedor si no hay jornadas cerradas', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesByIds: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.syncResultsForClosedMatchdays();

    expect(result).toEqual({ newlyFinished: [], inProgress: [] });
    expect(footballProvider.getFixturesByIds).not.toHaveBeenCalled();
  });

  it('junta los partidos pendientes de varias jornadas en una unica llamada al proveedor', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      {
        id: 'md-1',
        matches: [{ externalId: 1, status: 'LIVE', kickoff: new Date('2026-03-05T18:00:00Z') }],
      },
      {
        id: 'md-2',
        matches: [
          {
            externalId: 2,
            status: 'SCHEDULED',
            kickoff: new Date('2026-03-05T19:00:00Z'),
          },
        ],
      },
    ]);
    prisma.match.findMany.mockResolvedValue([{ status: 'FINISHED' }]);
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesByIds: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    await service.syncResultsForClosedMatchdays();

    expect(footballProvider.getFixturesByIds).toHaveBeenCalledTimes(1);
    expect(footballProvider.getFixturesByIds).toHaveBeenCalledWith([1, 2]);

    jest.useRealTimers();
  });

  it('no pregunta por partidos cuyo kickoff todavia no ha llegado', async () => {
    const now = new Date('2026-03-05T20:00:00Z');
    jest.useFakeTimers().setSystemTime(now);

    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      {
        id: 'md-1',
        matches: [
          {
            externalId: 1,
            status: 'SCHEDULED',
            kickoff: new Date('2026-03-05T21:00:00Z'),
          },
        ],
      },
    ]);
    prisma.match.findMany.mockResolvedValue([{ status: 'SCHEDULED' }]);
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesByIds: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    await service.syncResultsForClosedMatchdays();

    expect(footballProvider.getFixturesByIds).not.toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('marca la jornada como FINISHED solo cuando todos sus partidos han terminado', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      {
        id: 'md-1',
        matches: [{ externalId: 1, status: 'FINISHED', kickoff: new Date('2020-01-01') }],
      },
      {
        id: 'md-2',
        matches: [{ externalId: 2, status: 'FINISHED', kickoff: new Date('2020-01-01') }],
      },
    ]);
    prisma.match.findMany.mockImplementation(({ where }: { where: { matchdayId: string } }) =>
      Promise.resolve(
        where.matchdayId === 'md-1'
          ? [{ status: 'FINISHED' }]
          : [{ status: 'FINISHED' }, { status: 'LIVE' }],
      ),
    );
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn(),
      getFixturesByIds: jest.fn().mockResolvedValue([]),
    };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const finished = await service.syncResultsForClosedMatchdays();

    expect(finished).toEqual({ newlyFinished: ['md-1'], inProgress: ['md-2'] });
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'md-1' },
      data: { status: 'FINISHED' },
    });
    expect(prisma.matchday.update).not.toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'md-2' } }),
    );
  });
});

describe('MatchdaysService.listForCompetitionWithUserPoints', () => {
  it('devuelve todas las jornadas de la competicion ordenadas, con los puntos sumados de las predicciones del usuario en ese grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'md-1', order: 1, status: 'FINISHED', closesAt: new Date('2026-01-01') },
      { id: 'md-2', order: 2, status: 'FINISHED', closesAt: new Date('2026-01-08') },
      { id: 'md-3', order: 3, status: 'OPEN', closesAt: new Date('2026-01-15') },
    ]);
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 3, match: { matchdayId: 'md-1' } },
      { pointsEarned: 0, match: { matchdayId: 'md-1' } },
      { pointsEarned: 5, match: { matchdayId: 'md-2' } },
    ]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.listForCompetitionWithUserPoints('c1', 'u1', 'g1');

    expect(prisma.prediction.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'u1',
        groupId: 'g1',
        match: { matchdayId: { in: ['md-1', 'md-2', 'md-3'] } },
      },
      select: { pointsEarned: true, match: { select: { matchdayId: true } } },
    });
    expect(result).toEqual([
      { id: 'md-1', order: 1, status: 'FINISHED', closesAt: new Date('2026-01-01'), points: 3 },
      { id: 'md-2', order: 2, status: 'FINISHED', closesAt: new Date('2026-01-08'), points: 5 },
      { id: 'md-3', order: 3, status: 'OPEN', closesAt: new Date('2026-01-15'), points: null },
    ]);
  });

  it('distingue una jornada sin ningun pronostico (points null) de una jugada con 0 puntos', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'md-1', order: 1, status: 'FINISHED', closesAt: new Date('2026-01-01') },
    ]);
    prisma.prediction.findMany.mockResolvedValue([
      { pointsEarned: 0, match: { matchdayId: 'md-1' } },
    ]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.listForCompetitionWithUserPoints('c1', 'u1', 'g1');

    expect(result).toEqual([
      { id: 'md-1', order: 1, status: 'FINISHED', closesAt: new Date('2026-01-01'), points: 0 },
    ]);
  });

  it('devuelve un array vacio sin consultar predicciones si la competicion no tiene jornadas', async () => {
    const prisma = buildPrismaMock();
    prisma.matchday.findMany.mockResolvedValue([]);
    const footballProvider = { getCurrentRoundFixtures: jest.fn(), getFixturesForRound: jest.fn() };

    const service = new MatchdaysService(prisma as never, footballProvider as never);
    const result = await service.listForCompetitionWithUserPoints('c1', 'u1', 'g1');

    expect(result).toEqual([]);
    expect(prisma.prediction.findMany).not.toHaveBeenCalled();
  });
});

describe('MatchdaysService.ensureUpcomingMatchday (siempre una jornada con algo por pronosticar)', () => {
  const competition = { id: 'c1', externalId: 140, currentSeason: 2026 };
  const futureFixture = (round: string, id: number) => ({
    fixtureId: id,
    round,
    kickoff: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    status: 'SCHEDULED',
    homeTeam: { name: 'Local', logoUrl: null },
    awayTeam: { name: 'Visitante', logoUrl: null },
    homeGoals: null,
    awayGoals: null,
  });

  function build(provider: Record<string, jest.Mock> = {}) {
    const prisma = buildPrismaMock();
    prisma.competition.findUnique.mockResolvedValue(competition);
    prisma.matchday.upsert.mockResolvedValue({ id: 'md-new', order: 8 });
    prisma.matchday.findUnique.mockResolvedValue({
      id: 'md-new',
      order: 8,
      status: 'OPEN',
      competitionId: 'c1',
      closesAt: new Date(),
    });
    const footballProvider = {
      getCurrentRoundFixtures: jest.fn().mockResolvedValue([]),
      getFixturesForRound: jest.fn().mockResolvedValue([]),
      ...provider,
    };
    const service = new MatchdaysService(prisma as never, footballProvider as never);
    return { service, prisma, footballProvider };
  }

  it('hasPredictableMatch cuenta solo partidos SCHEDULED por empezar de jornadas pendientes', async () => {
    const { service, prisma } = build();
    prisma.match.count.mockResolvedValue(3);

    expect(await service.hasPredictableMatch('c1')).toBe(true);
    expect(prisma.match.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: 'SCHEDULED',
        kickoff: { gt: expect.any(Date) },
        matchday: { competitionId: 'c1', status: { in: ['SCHEDULED', 'OPEN', 'CLOSED'] } },
      }),
    });

    prisma.match.count.mockResolvedValue(0);
    expect(await service.hasPredictableMatch('c1')).toBe(false);
  });

  it('no consulta al proveedor si ya hay partidos por empezar', async () => {
    const { service, prisma, footballProvider } = build();
    prisma.match.count.mockResolvedValue(2);

    expect(await service.ensureUpcomingMatchday('c1')).toBe(true);
    expect(footballProvider.getCurrentRoundFixtures).not.toHaveBeenCalled();
    expect(footballProvider.getFixturesForRound).not.toHaveBeenCalled();
  });

  it('con la ultima jornada solo con partidos empezados, pide ya la siguiente por numero', async () => {
    const { service, prisma, footballProvider } = build({
      getFixturesForRound: jest.fn().mockResolvedValue([futureFixture('Regular Season - 8', 801)]),
    });
    // 1a comprobacion: nada por empezar; tras traer la ronda 8: ya hay algo.
    prisma.match.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    prisma.matchday.findFirst
      .mockResolvedValueOnce({ id: 'md-7' }) // hay una jornada pendiente (la 7, en juego)
      .mockResolvedValueOnce({ id: 'md-7', order: 7, name: 'Regular Season - 7' }); // la ultima por orden

    expect(await service.ensureUpcomingMatchday('c1')).toBe(true);
    expect(footballProvider.getCurrentRoundFixtures).not.toHaveBeenCalled();
    expect(footballProvider.getFixturesForRound).toHaveBeenCalledWith(140, 2026, 8);
  });

  it('sin ninguna jornada pendiente trae primero la jornada en curso del proveedor', async () => {
    const { service, prisma, footballProvider } = build({
      getCurrentRoundFixtures: jest
        .fn()
        .mockResolvedValue([futureFixture('Regular Season - 8', 801)]),
    });
    prisma.match.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    prisma.matchday.findFirst.mockResolvedValue(null); // ni pendiente ni activa
    prisma.matchday.count.mockResolvedValue(7);

    expect(await service.ensureUpcomingMatchday('c1')).toBe(true);
    expect(footballProvider.getCurrentRoundFixtures).toHaveBeenCalledWith(140, 2026);
    expect(footballProvider.getFixturesForRound).not.toHaveBeenCalled();
  });

  it('no adivina la siguiente ronda en eliminatorias (nombre de ronda sin numero)', async () => {
    const { service, prisma, footballProvider } = build();
    prisma.match.count.mockResolvedValue(0);
    prisma.matchday.findFirst
      .mockResolvedValueOnce({ id: 'md-ko' })
      .mockResolvedValueOnce({ id: 'md-ko', order: 3, name: 'Round of 16' });

    expect(await service.ensureUpcomingMatchday('c1')).toBe(false);
    expect(footballProvider.getFixturesForRound).not.toHaveBeenCalled();
  });

  it('false (sin romper) si el proveedor aun no publica la siguiente ronda', async () => {
    const { service, prisma } = build();
    prisma.match.count.mockResolvedValue(0);
    prisma.matchday.findFirst
      .mockResolvedValueOnce({ id: 'md-38' })
      .mockResolvedValueOnce({ id: 'md-38', order: 38, name: 'Regular Season - 38' });

    expect(await service.ensureUpcomingMatchday('c1')).toBe(false);
  });
});

describe('MatchdaysService.refreshUnconfirmedKickoffs (horas provisionales)', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  const placeholder = new Date('2026-10-11T00:00:00Z'); // 2:00 en España
  const real = (hour: number) => new Date(`2026-10-11T${String(hour).padStart(2, '0')}:00:00Z`);

  function build(
    candidates: Array<{ externalId: number; matchdayId: string; kickoff: Date }>,
    fixtures: unknown[],
  ) {
    const prisma = buildPrismaMock();
    prisma.match.findMany.mockResolvedValue(candidates);
    prisma.match.findFirst.mockResolvedValue(null);
    const provider = { getFixturesByIds: jest.fn().mockResolvedValue(fixtures) };
    const service = new MatchdaysService(prisma as never, provider as never);
    return { prisma, provider, service };
  }

  const fixture = (fixtureId: number, kickoff: Date) => ({
    fixtureId,
    kickoff,
    status: 'SCHEDULED',
    homeTeam: { name: 'A', logoUrl: null },
    awayTeam: { name: 'B', logoUrl: null },
    homeGoals: null,
    awayGoals: null,
  });

  it('busca solo partidos por jugar de jornadas abiertas o programadas y con kickoff futuro', async () => {
    const { prisma, service } = build([], []);

    await service.refreshUnconfirmedKickoffs(now);

    expect(prisma.match.findMany).toHaveBeenCalledWith({
      where: {
        status: 'SCHEDULED',
        kickoff: { gt: now },
        matchday: { status: { in: ['SCHEDULED', 'OPEN'] } },
      },
      select: { externalId: true, matchdayId: true, kickoff: true },
    });
  });

  it('sin horas provisionales no gasta ninguna peticion al proveedor', async () => {
    const { provider, service } = build(
      [{ externalId: 1, matchdayId: 'md1', kickoff: real(19) }],
      [],
    );

    expect(await service.refreshUnconfirmedKickoffs(now)).toBe(0);
    expect(provider.getFixturesByIds).not.toHaveBeenCalled();
  });

  it('corrige la hora de los partidos que el proveedor ya ha confirmado y el cierre de la jornada', async () => {
    const { prisma, provider, service } = build(
      [
        { externalId: 1, matchdayId: 'md1', kickoff: placeholder },
        { externalId: 2, matchdayId: 'md1', kickoff: placeholder },
        { externalId: 3, matchdayId: 'md1', kickoff: real(19) }, // ya confirmado: ni se pregunta
      ],
      [fixture(1, real(14)), fixture(2, real(21))],
    );
    prisma.match.findFirst.mockResolvedValue({ kickoff: real(14) });

    const changed = await service.refreshUnconfirmedKickoffs(now);

    expect(changed).toBe(2);
    expect(provider.getFixturesByIds).toHaveBeenCalledWith([1, 2]);
    expect(prisma.match.update).toHaveBeenCalledTimes(2);
    expect(prisma.match.update).toHaveBeenCalledWith({
      where: { externalId: 1 },
      data: expect.objectContaining({ kickoff: real(14) }),
    });
    expect(prisma.matchday.update).toHaveBeenCalledTimes(1);
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'md1' },
      data: { closesAt: real(14) },
    });
  });

  it('si el proveedor sigue sin hora (la misma provisional), no toca nada', async () => {
    const { prisma, service } = build(
      [{ externalId: 1, matchdayId: 'md1', kickoff: placeholder }],
      [fixture(1, placeholder)],
    );

    expect(await service.refreshUnconfirmedKickoffs(now)).toBe(0);
    expect(prisma.match.update).not.toHaveBeenCalled();
    expect(prisma.matchday.update).not.toHaveBeenCalled();
  });

  it('solo recalcula el cierre de las jornadas cuyos partidos cambiaron', async () => {
    const { prisma, service } = build(
      [
        { externalId: 1, matchdayId: 'md1', kickoff: placeholder },
        { externalId: 2, matchdayId: 'md2', kickoff: placeholder },
      ],
      [fixture(1, real(16)), fixture(2, placeholder)],
    );
    prisma.match.findFirst.mockResolvedValue({ kickoff: real(16) });

    await service.refreshUnconfirmedKickoffs(now);

    expect(prisma.matchday.update).toHaveBeenCalledTimes(1);
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'md1' },
      data: { closesAt: real(16) },
    });
  });
});
