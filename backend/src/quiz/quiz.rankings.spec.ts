import { QuizService } from './quiz.service';

const ranked = (n: number, extra: Record<string, unknown> = {}) => ({
  position: BigInt(n),
  rowNumber: BigInt(n),
  userId: `u${n}`,
  name: `Jugador ${n}`,
  avatarUrl: null,
  avatarBackground: null,
  points: BigInt(300 - n),
  quizzesPlayed: BigInt(2),
  ...extra,
});

function build(rows: ReturnType<typeof ranked>[], own: ReturnType<typeof ranked>[]) {
  const prisma = {
    competition: { findMany: jest.fn().mockResolvedValue([]) },
    $queryRaw: jest.fn().mockResolvedValue([]), // quizzes por refrescar: ninguno
    // La pagina y la fila propia llegan en la misma consulta, ordenadas por numero de fila.
    $transaction: jest.fn().mockResolvedValue([[...rows, ...own], [{ total: BigInt(300) }]]),
    quizEvent: { count: jest.fn().mockResolvedValue(0) },
  };
  return { prisma, service: new QuizService(prisma as never, {} as never) };
}

describe('QuizService.rankings — filas numeradas', () => {
  it('cada fila lleva su numero de fila (el cursor) ademas de la posicion, tambien la propia', async () => {
    const { service } = build(
      [ranked(11), ranked(12), ranked(13)],
      [ranked(200, { position: BigInt(195) })],
    );

    const result = await service.rankings('u200', { cursor: '10', limit: 2 });

    // La fila propia (la 200) no se cuela en la pagina.
    expect(result.rows.map((r) => r.rowNumber)).toEqual([11, 12]);
    expect(result.me).toEqual(
      expect.objectContaining({ userId: 'u200', position: 195, rowNumber: 200 }),
    );
    expect(result.total).toBe(300);
    // La pagina siguiente empieza tras la ultima fila devuelta.
    expect(result.nextCursor).toBe('12');
  });

  it('los empates comparten posicion pero no numero de fila', async () => {
    const { service } = build(
      [ranked(5, { position: BigInt(4) }), ranked(6, { position: BigInt(4) })],
      [],
    );

    const result = await service.rankings('u1', { limit: 20 });

    expect(result.rows.map((r) => [r.position, r.rowNumber])).toEqual([
      [4, 5],
      [4, 6],
    ]);
    expect(result.me).toBeNull();
    expect(result.nextCursor).toBeNull();
  });
});
