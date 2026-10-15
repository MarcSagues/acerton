import { QuizService } from './quiz.service';

const NOW = Date.now();
const HOUR = 3_600_000;

const COMPETITIONS = [
  { id: 'c1', code: 'LA_LIGA', name: 'La Liga', logoUrl: null, currentSeason: 2026 },
  { id: 'c2', code: 'PREMIER_LEAGUE', name: 'Premier League', logoUrl: null, currentSeason: 2026 },
];

/** Quizzes mixtos ligeros: dos abiertos y dos ya cerrados. */
const LIGHT_EVENTS = [
  { id: 'mixed-open', status: 'OPEN', closesAt: new Date(NOW + 2 * HOUR), windowKey: 'w3' },
  { id: 'mixed-old', status: 'FINISHED', closesAt: new Date(NOW - 96 * HOUR), windowKey: 'w1' },
  { id: 'mixed-done', status: 'CLOSED', closesAt: new Date(NOW - 24 * HOUR), windowKey: 'w2' },
  { id: 'mixed-soon', status: 'OPEN', closesAt: new Date(NOW + HOUR), windowKey: 'w4' },
];

function fullEvent(id: string) {
  const mixed = id.startsWith('mixed');
  const match = (competition: (typeof COMPETITIONS)[number], n: number) => ({
    id: `${id}-m${n}`,
    kickoff: new Date(NOW + HOUR),
    status: 'SCHEDULED',
    matchday: { competition },
  });
  const matches = mixed
    ? [match(COMPETITIONS[1], 1), match(COMPETITIONS[0], 2)]
    : [match(COMPETITIONS[0], 1)];
  return {
    id,
    matchdayId: mixed ? null : `md-${id}`,
    windowKey: mixed ? '2026-10-16-WEEKEND' : null,
    windowKind: mixed ? 'WEEKEND' : null,
    windowStart: mixed ? new Date('2026-10-15T22:00:00Z') : null,
    windowEnd: mixed ? new Date('2026-10-19T22:00:00Z') : null,
    number: mixed ? 3 : null,
    seasonLabel: '2026/27',
    status: 'OPEN',
    closesAt: new Date(NOW + HOUR),
    lockedAt: null,
    matchday: mixed ? null : { order: 7, name: 'Jornada 7', competition: COMPETITIONS[0], matches },
    questions: matches.map((m, i) => ({
      id: `${id}-q${i}`,
      matchId: m.id,
      resolution: 'PENDING',
      match: m,
    })),
  };
}

function build() {
  const prisma = {
    competition: { findMany: jest.fn().mockResolvedValue(COMPETITIONS) },
    match: { findMany: jest.fn().mockResolvedValue([]) },
    quizEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn(
        ({ include, where }: { include?: unknown; where: { id?: { in: string[] } } }) =>
          Promise.resolve(include ? (where.id?.in ?? []).map(fullEvent) : LIGHT_EVENTS),
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

  it('elige los abiertos, del que cierra antes al que mas tarda, y el ultimo mixto cerrado', async () => {
    const { service } = build();

    const result = await service.overview('u1');

    expect(result.events.map((q) => q.id)).toEqual(['mixed-soon', 'mixed-open', 'mixed-done']);
    const mixed = result.events.find((q) => q.id === 'mixed-open')!;
    expect(mixed).toEqual(
      expect.objectContaining({
        kind: 'MIXED',
        matchdayOrder: 3,
        window: {
          kind: 'WEEKEND',
          start: '2026-10-15T22:00:00.000Z',
          end: '2026-10-19T22:00:00.000Z',
          firstKickoff: new Date(NOW + HOUR).toISOString(),
          lastKickoff: new Date(NOW + HOUR).toISOString(),
        },
      }),
    );
    expect(mixed.competitions.map((c) => c.id)).toEqual(['c2', 'c1']);
  });

  it('solo pide quizzes mixtos: los antiguos por liga y jornada ya no se ofrecen', async () => {
    const { prisma, service } = build();

    await service.overview('u1');

    expect(prisma.quizEvent.findMany.mock.calls[0][0].where).toEqual({
      windowKey: { not: null },
      seasonLabel: { in: ['2026/27'] },
    });
  });

  it('para las apps anteriores repite el quiz mixto en cada liga', async () => {
    const { service } = build();

    const result = await service.overview('u1');

    expect(result.quizzes.map((q) => `${q.id}@${q.competition.id}`)).toEqual([
      'mixed-soon@c1',
      'mixed-soon@c2',
      'mixed-open@c1',
      'mixed-open@c2',
      'mixed-done@c1',
      'mixed-done@c2',
    ]);
  });

  it('refresca los quizzes sin cerrar, y no vuelve a hacerlo hasta que pasa el tiempo', async () => {
    const { service, refresh } = build();

    await service.overview('u1');
    expect(refresh.mock.calls.map((c) => c[0]).sort()).toEqual(['mixed-open', 'mixed-soon']);

    refresh.mockClear();
    await service.overview('u1');
    expect(refresh).not.toHaveBeenCalled(); // dentro del tope: el cron de cada minuto ya los mantiene al dia
  });

  it('publicar y pedir las ligas se hace una vez, no en cada apertura', async () => {
    const { prisma, service } = build();
    const publish = jest.spyOn(service, 'publishAvailable');

    await service.overview('u1');
    await service.overview('u1');
    await service.overview('u1');

    expect(prisma.competition.findMany).toHaveBeenCalledTimes(1);
    expect(publish).toHaveBeenCalledTimes(1);
  });

  it('las aperturas a la vez comparten el mismo refresco en vez de lanzar una transaccion cada una', async () => {
    const { service, refresh } = build();

    await Promise.all([service.overview('u1'), service.overview('u2'), service.overview('u3')]);

    expect(refresh.mock.calls.filter((c) => c[0] === 'mixed-soon')).toHaveLength(1);
  });

  it('sin ligas del Quiz devuelve el resumen vacio sin consultar quizzes', async () => {
    const { prisma, service } = build();
    prisma.competition.findMany.mockResolvedValue([]);

    const result = await service.overview('u1');

    expect(result.quizzes).toEqual([]);
    expect(result.events).toEqual([]);
    expect(prisma.quizEvent.findMany).not.toHaveBeenCalled();
  });
});
