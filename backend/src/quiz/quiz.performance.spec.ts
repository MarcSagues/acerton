import { QuizService } from './quiz.service';

const NOW = Date.now();
const HOUR = 3_600_000;

const COMPETITIONS = [
  { id: 'c1', code: 'LA_LIGA', name: 'La Liga', logoUrl: null, currentSeason: 2026 },
  { id: 'c2', code: 'PREMIER_LEAGUE', name: 'Premier League', logoUrl: null, currentSeason: 2026 },
];

/** Quizzes ligeros de la temporada: por liga, uno abierto (el siguiente) y uno ya cerrado (el anterior). */
const LIGHT_EVENTS = [
  {
    id: 'c1-open',
    status: 'OPEN',
    closesAt: new Date(NOW + HOUR),
    matchday: { competitionId: 'c1' },
  },
  {
    id: 'c1-done',
    status: 'FINISHED',
    closesAt: new Date(NOW - 48 * HOUR),
    matchday: { competitionId: 'c1' },
  },
  {
    id: 'c2-open',
    status: 'OPEN',
    closesAt: new Date(NOW + 2 * HOUR),
    matchday: { competitionId: 'c2' },
  },
  {
    id: 'c2-old',
    status: 'FINISHED',
    closesAt: new Date(NOW - 96 * HOUR),
    matchday: { competitionId: 'c2' },
  },
  {
    id: 'c2-done',
    status: 'CLOSED',
    closesAt: new Date(NOW - 24 * HOUR),
    matchday: { competitionId: 'c2' },
  },
];

function fullEvent(id: string, competition: (typeof COMPETITIONS)[number]) {
  return {
    id,
    matchdayId: `md-${id}`,
    seasonLabel: '2026/27',
    status: 'OPEN',
    closesAt: new Date(NOW + HOUR),
    lockedAt: null,
    matchday: {
      order: 7,
      name: 'Jornada 7',
      competition,
      matches: [{ id: 'm1', kickoff: new Date(NOW + HOUR), status: 'SCHEDULED' }],
    },
    questions: [{ id: `${id}-q1`, matchId: 'm1', resolution: 'PENDING' }],
  };
}

function build() {
  const prisma = {
    competition: { findMany: jest.fn().mockResolvedValue(COMPETITIONS) },
    matchday: { findMany: jest.fn().mockResolvedValue([]) },
    quizEvent: {
      findMany: jest.fn(
        ({ include, where }: { include?: unknown; where: { id?: { in: string[] } } }) =>
          Promise.resolve(
            include
              ? (where.id?.in ?? []).map((id) =>
                  fullEvent(id, id.startsWith('c1') ? COMPETITIONS[0] : COMPETITIONS[1]),
                )
              : LIGHT_EVENTS,
          ),
      ),
    },
    quizParticipation: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const service = new QuizService(prisma as never, {} as never);
  const refresh = jest.spyOn(service, 'refreshEvent').mockResolvedValue(undefined);
  return { prisma, service, refresh };
}

describe('QuizService.overview — rendimiento', () => {
  it('resuelve el resumen con pocas consultas en lote, sin recorrer cada liga y cada quiz', async () => {
    const { prisma, service } = build();

    const result = await service.overview('u1');

    // Antes: varias consultas y un refresco por liga y por quiz (cientos al abrir el Quiz).
    expect(prisma.competition.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.quizParticipation.findMany).toHaveBeenCalledTimes(1);
    // En frio: lista ligera, otra vez tras refrescar, y los quizzes elegidos. Con todo al dia, solo la lista ligera y los elegidos.
    expect(prisma.quizEvent.findMany).toHaveBeenCalledTimes(3);
    prisma.quizEvent.findMany.mockClear();
    await service.overview('u1');
    expect(prisma.quizEvent.findMany).toHaveBeenCalledTimes(2);
    expect(result.competitions.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('por liga elige el siguiente abierto y el ultimo cerrado', async () => {
    const { service } = build();

    const result = await service.overview('u1');

    expect(result.quizzes.map((q) => q.id)).toEqual(['c1-open', 'c1-done', 'c2-open', 'c2-done']);
  });

  it('refresca los quizzes sin cerrar, y no vuelve a hacerlo hasta que pasa el tiempo', async () => {
    const { service, refresh } = build();

    await service.overview('u1');
    expect(refresh.mock.calls.map((c) => c[0]).sort()).toEqual(['c1-open', 'c2-open']);

    refresh.mockClear();
    await service.overview('u1');
    expect(refresh).not.toHaveBeenCalled(); // dentro del tope: el cron de cada minuto ya los mantiene al dia
  });

  it('publicar rondas y pedir las ligas se hace una vez, no en cada apertura', async () => {
    const { prisma, service } = build();

    await service.overview('u1');
    await service.overview('u1');
    await service.overview('u1');

    expect(prisma.competition.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.matchday.findMany).toHaveBeenCalledTimes(COMPETITIONS.length); // una sola publicacion, una consulta por liga
  });

  it('las aperturas a la vez comparten el mismo refresco en vez de lanzar una transaccion cada una', async () => {
    const { service, refresh } = build();

    await Promise.all([service.overview('u1'), service.overview('u2'), service.overview('u3')]);

    expect(refresh.mock.calls.filter((c) => c[0] === 'c1-open')).toHaveLength(1);
  });

  it('sin ligas del Quiz devuelve el resumen vacio sin consultar quizzes', async () => {
    const { prisma, service } = build();
    prisma.competition.findMany.mockResolvedValue([]);

    const result = await service.overview('u1');

    expect(result.quizzes).toEqual([]);
    expect(prisma.quizEvent.findMany).not.toHaveBeenCalled();
  });
});
