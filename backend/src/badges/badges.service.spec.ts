import { BadgesService } from './badges.service';

function buildPrismaMock() {
  return {
    groupMembership: { findMany: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    streak: { findMany: jest.fn(), findUnique: jest.fn() },
    prediction: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    group: { findUnique: jest.fn().mockResolvedValue({ scoringMode: 'ONE_X_TWO' }) },
    matchday: { findUnique: jest.fn() },
    rankingSnapshot: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    badge: { findUnique: jest.fn(), findMany: jest.fn() },
    userBadge: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({}) },
  };
}

describe('BadgesService.getProgressForUser', () => {
  it('usa la mejor racha entre todos los grupos del usuario, sin superar el objetivo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      { groupId: 'g1', group: { scoringMode: 'ONE_X_TWO' } },
      { groupId: 'g2', group: { scoringMode: 'ONE_X_TWO' } },
    ]);
    prisma.streak.findMany.mockResolvedValue([{ currentStreak: 3 }, { currentStreak: 7 }]);

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['STREAK_5']).toEqual({ current: 5, target: 5 });
    expect(progress['STREAK_10']).toEqual({ current: 7, target: 10 });
    expect(progress['STREAK_25']).toEqual({ current: 7, target: 25 });
  });

  it('cuenta los aciertos consecutivos mas recientes de cada grupo y se queda con el mejor', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      { groupId: 'g1', group: { scoringMode: 'ONE_X_TWO' } },
      { groupId: 'g2', group: { scoringMode: 'ONE_X_TWO' } },
    ]);
    prisma.streak.findMany.mockResolvedValue([]);
    prisma.prediction.findMany.mockImplementation(({ where }: { where: { groupId?: string } }) => {
      if (where.groupId === 'g1') {
        // Mas reciente primero: 2 aciertos seguidos y luego un fallo -> racha de 2.
        return Promise.resolve([{ pointsEarned: 1 }, { pointsEarned: 2 }, { pointsEarned: 0 }]);
      }
      if (where.groupId === 'g2') {
        // g2: 4 aciertos seguidos, ninguno mas antiguo puntuado todavia -> racha de 4.
        return Promise.resolve([{ pointsEarned: 1 }, { pointsEarned: 1 }, { pointsEarned: 5 }, { pointsEarned: 2 }]);
      }
      // Consultas sin groupId (p.ej. el conteo de competiciones distintas, que mira todos los grupos a la vez).
      return Promise.resolve([]);
    });

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['HOT_STREAK_5']).toEqual({ current: 4, target: 5 });
  });

  it('una racha caliente rota por un fallo en el partido mas reciente da progreso 0, aunque haya aciertos antes', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1', group: { scoringMode: 'ONE_X_TWO' } }]);
    prisma.streak.findMany.mockResolvedValue([]);
    prisma.prediction.findMany.mockImplementation(({ where }: { where: { groupId?: string } }) =>
      Promise.resolve(where.groupId === 'g1' ? [{ pointsEarned: 0 }, { pointsEarned: 1 }, { pointsEarned: 1 }] : []),
    );

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['HOT_STREAK_5']).toEqual({ current: 0, target: 5 });
  });

  it('sin grupos, todo el progreso queda a 0', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([]);

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['STREAK_5']).toEqual({ current: 0, target: 5 });
    expect(progress['STREAK_10']).toEqual({ current: 0, target: 10 });
    expect(progress['STREAK_25']).toEqual({ current: 0, target: 25 });
    expect(progress['HOT_STREAK_5']).toEqual({ current: 0, target: 5 });
    expect(progress['PREDICTIONS_100']).toEqual({ current: 0, target: 100 });
    expect(progress['ONE_X_TWO_HITS_25']).toEqual({ current: 0, target: 25 });
    expect(progress['ONE_X_TWO_HITS_100']).toEqual({ current: 0, target: 100 });
    expect(progress['EXACT_SCORE_HITS_10']).toEqual({ current: 0, target: 10 });
  });

  it('cuenta el total de pronosticos y de aciertos 1X2, topados al objetivo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1', group: { scoringMode: 'ONE_X_TWO' } }]);
    prisma.streak.findMany.mockResolvedValue([]);
    prisma.prediction.count.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.pointsEarned) return Promise.resolve(30); // aciertos
      return Promise.resolve(120); // total de pronosticos
    });

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['PREDICTIONS_100']).toEqual({ current: 100, target: 100 });
    expect(progress['ONE_X_TWO_HITS_25']).toEqual({ current: 25, target: 25 });
    expect(progress['ONE_X_TWO_HITS_100']).toEqual({ current: 30, target: 100 });
  });

  it('en un grupo de resultado exacto, cuenta los marcadores exactos acertados (no solo el ganador)', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ groupId: 'g1', group: { scoringMode: 'EXACT_SCORE' } }]);
    prisma.streak.findMany.mockResolvedValue([]);
    // Distingue la consulta de countExactScoreHits (filtra por predictedHomeScore)
    // de otras que tambien usan prediction.findMany con otra forma de `where`
    // (currentHotStreakForGroup, el conteo de competiciones distintas...).
    prisma.prediction.findMany.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.predictedHomeScore) {
        return Promise.resolve([
          { predictedHomeScore: 2, predictedAwayScore: 1, match: { homeScore: 2, awayScore: 1 } }, // exacto
          { predictedHomeScore: 1, predictedAwayScore: 0, match: { homeScore: 3, awayScore: 0 } }, // solo ganador
          { predictedHomeScore: 0, predictedAwayScore: 0, match: { homeScore: 0, awayScore: 0 } }, // exacto
        ]);
      }
      return Promise.resolve([]);
    });

    const service = new BadgesService(prisma as never);
    const progress = await service.getProgressForUser('u1');

    expect(progress['EXACT_SCORE_HITS_10']).toEqual({ current: 2, target: 10 });
    // Los aciertos 1X2 no se cuentan en un grupo de resultado exacto.
    expect(progress['ONE_X_TWO_HITS_25']).toEqual({ current: 0, target: 25 });
  });
});

describe('BadgesService.evaluateAfterMatchdayClose', () => {
  it('concede "Centenario" al llegar a 100 pronosticos en el grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.prediction.count.mockResolvedValue(100);
    prisma.badge.findUnique.mockResolvedValue({ id: 'b1', code: 'PREDICTIONS_100', name: 'Centenario' });

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'Centenario' });
  });

  it('no concede "Centenario" si ya se tenia (idempotente)', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.prediction.count.mockResolvedValue(100);
    prisma.badge.findUnique.mockResolvedValue({ id: 'b1', code: 'PREDICTIONS_100', name: 'Centenario' });
    prisma.userBadge.findUnique.mockResolvedValue({ id: 'existing' });

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).not.toContainEqual(expect.objectContaining({ badgeName: 'Centenario' }));
    expect(prisma.userBadge.create).not.toHaveBeenCalled();
  });

  it('en un grupo 1X2, concede "Buen ojo" a los 25 aciertos y no evalua marcadores exactos', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'ONE_X_TWO' });
    prisma.prediction.count.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.pointsEarned) return Promise.resolve(25);
      return Promise.resolve(0);
    });
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'ONE_X_TWO_HITS_25' });
    // No debe evaluar marcadores exactos en un grupo 1X2.
    expect(awarded).not.toContainEqual(expect.objectContaining({ badgeName: 'EXACT_SCORE_HIT_1' }));
  });

  it('en un grupo de resultado exacto, concede "Al milímetro" con un solo marcador exacto acertado', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.group.findUnique.mockResolvedValue({ scoringMode: 'EXACT_SCORE' });
    // Distingue la consulta de countExactScoreHits (filtra por predictedHomeScore)
    // de las demas que tambien usan prediction.findMany con otra forma de `where`
    // (checkFirstMatchdayPlayed, checkCompetitions...) para no cruzar datos.
    prisma.prediction.findMany.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.predictedHomeScore) {
        return Promise.resolve([
          { predictedHomeScore: 1, predictedAwayScore: 1, match: { homeScore: 1, awayScore: 1 } },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'EXACT_SCORE_HIT_1' });
    expect(awarded).not.toContainEqual(expect.objectContaining({ badgeName: 'EXACT_SCORE_HITS_10' }));
  });
});

describe('BadgesService.evaluateAfterMatchdayClose — insignias añadidas a peticion del usuario (hasta 20)', () => {
  it('concede "Racha de fuego" (HOT_STREAK_10) con 10 aciertos seguidos, y no "En racha" a la vez', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.findMany.mockImplementation(({ where }: { where: Record<string, unknown> }) => {
      if (where.pointsEarned && !where.match) {
        return Promise.resolve(Array.from({ length: 10 }, () => ({ pointsEarned: 1 })));
      }
      return Promise.resolve([]);
    });
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'HOT_STREAK_10' });
    expect(awarded).not.toContainEqual(expect.objectContaining({ badgeName: 'HOT_STREAK_5' }));
  });

  it('concede "Pleno" solo si TODOS los partidos de la jornada dieron puntos', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockImplementation(({ where }: { where: { match?: { matchdayId?: string } } }) => {
      if (where.match?.matchdayId) {
        return Promise.resolve([{ pointsEarned: 1 }, { pointsEarned: 2 }]);
      }
      return Promise.resolve([]);
    });
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'PERFECT_MATCHDAY' });
  });

  it('no concede "Pleno" si algun partido de la jornada quedo sin puntos', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.matchday.findUnique.mockResolvedValue({ matches: [{ id: 'm1' }, { id: 'm2' }] });
    prisma.prediction.findMany.mockImplementation(({ where }: { where: { match?: { matchdayId?: string } } }) => {
      if (where.match?.matchdayId) {
        return Promise.resolve([{ pointsEarned: 1 }, { pointsEarned: 0 }]);
      }
      return Promise.resolve([]);
    });

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).not.toContainEqual(expect.objectContaining({ badgeName: 'PERFECT_MATCHDAY' }));
  });

  it('concede "Comodín de oro" cuando el comodin de remontada dio puntos 5 veces', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.count.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(where.OR ? 5 : 0),
    );
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'WILDCARD_HITS_5' });
  });

  it('concede "Sociable" al llegar a 3 grupos', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.groupMembership.count.mockResolvedValue(3);
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'GROUPS_JOINED_3' });
  });

  it('concede "Especialista en empates" a los 10 empates acertados', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.count.mockImplementation(({ where }: { where: { match?: { result?: string } } }) =>
      Promise.resolve(where.match?.result === 'DRAW' ? 10 : 0),
    );
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'DRAW_HITS_10' });
  });

  it('concede "Multiliga" al pronosticar en 3 competiciones distintas', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.findMany.mockImplementation(({ where }: { where: { groupId?: string } }) => {
      if (!where.groupId) {
        return Promise.resolve([
          { match: { matchday: { competitionId: 'c1' } } },
          { match: { matchday: { competitionId: 'c2' } } },
          { match: { matchday: { competitionId: 'c3' } } },
          { match: { matchday: { competitionId: 'c1' } } },
        ]);
      }
      return Promise.resolve([]);
    });
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'COMPETITIONS_3' });
  });

  it('concede "En el podio" a los 5 podios semanales', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.rankingSnapshot.count.mockResolvedValue(5);
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'PODIUM_5' });
  });

  it('concede "Leyenda" (PREDICTIONS_500) ademas de "Centenario" solo al llegar exactamente a 500', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.count.mockImplementation(({ where }: { where: Record<string, unknown> }) =>
      Promise.resolve(Object.keys(where).length === 2 ? 500 : 0),
    );
    prisma.badge.findUnique.mockImplementation(({ where }: { where: { code: string } }) =>
      Promise.resolve({ id: where.code, code: where.code, name: where.code }),
    );

    const service = new BadgesService(prisma as never);
    const awarded = await service.evaluateAfterMatchdayClose('g1', 'md1');

    expect(awarded).toContainEqual({ userId: 'u1', badgeName: 'PREDICTIONS_500' });
    expect(awarded).not.toContainEqual(expect.objectContaining({ badgeName: 'PREDICTIONS_100' }));
  });
});

describe('BadgesService.checkGroupFounder', () => {
  it('concede "Fundador" al crear un grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.badge.findUnique.mockResolvedValue({ id: 'b1', code: 'GROUP_FOUNDER', name: 'Fundador' });

    const service = new BadgesService(prisma as never);
    const awarded = await service.checkGroupFounder('u1', 'g1');

    expect(awarded).toEqual([{ userId: 'u1', badgeName: 'Fundador' }]);
    expect(prisma.userBadge.create).toHaveBeenCalledWith({
      data: { userId: 'u1', badgeId: 'b1', groupId: 'g1', matchdayId: undefined },
    });
  });

  it('no lanza si algo falla al conceder la insignia (no debe romper la creacion del grupo)', async () => {
    const prisma = buildPrismaMock();
    prisma.badge.findUnique.mockRejectedValue(new Error('DB caida'));

    const service = new BadgesService(prisma as never);
    const awarded = await service.checkGroupFounder('u1', 'g1');

    expect(awarded).toEqual([]);
  });
});
