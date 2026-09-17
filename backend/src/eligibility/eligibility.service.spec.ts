import { EligibilityService } from './eligibility.service';

function buildPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    groupMembership: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    groupCompetition: {
      findMany: jest.fn(),
    },
    matchday: {
      findMany: jest.fn(),
    },
    prediction: {
      findMany: jest.fn(),
    },
    ...overrides,
  };
}

describe('EligibilityService.computeMemberEligibility', () => {
  it('no es elegible si el usuario no es miembro del grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue(null);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeMemberEligibility('g1', 'u1');

    expect(result).toEqual({
      userId: 'u1',
      availableMatchdays: 0,
      participatedMatchdays: 0,
      eligible: false,
    });
  });

  it('no es elegible si el grupo no tiene ninguna competicion activa', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({ joinedAt: new Date('2026-01-01') });
    prisma.groupCompetition.findMany.mockResolvedValue([]);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeMemberEligibility('g1', 'u1');

    expect(result.eligible).toBe(false);
    expect(prisma.matchday.findMany).not.toHaveBeenCalled();
  });

  it('no es elegible si todavia no hay ninguna jornada disponible desde que se incorporo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({ joinedAt: new Date('2026-01-01') });
    prisma.groupCompetition.findMany.mockResolvedValue([{ competitionId: 'c1' }]);
    prisma.matchday.findMany.mockResolvedValue([]);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeMemberEligibility('g1', 'u1');

    expect(result).toEqual({
      userId: 'u1',
      availableMatchdays: 0,
      participatedMatchdays: 0,
      eligible: false,
    });
    expect(prisma.prediction.findMany).not.toHaveBeenCalled();
  });

  it('excluye del calculo las jornadas ya cerradas antes de incorporarse (filtro closesAt > joinedAt)', async () => {
    const prisma = buildPrismaMock();
    const joinedAt = new Date('2026-03-01');
    prisma.groupMembership.findUnique.mockResolvedValue({ joinedAt });
    prisma.groupCompetition.findMany.mockResolvedValue([{ competitionId: 'c1' }]);
    prisma.matchday.findMany.mockResolvedValue([{ id: 'md-2' }, { id: 'md-3' }]);
    prisma.prediction.findMany.mockResolvedValue([]);

    const service = new EligibilityService(prisma as never);
    await service.computeMemberEligibility('g1', 'u1');

    expect(prisma.matchday.findMany).toHaveBeenCalledWith({
      where: {
        competitionId: { in: ['c1'] },
        closesAt: { gt: joinedAt },
        status: { in: ['CLOSED', 'FINISHED'] },
      },
      select: { id: true },
    });
  });

  it('es elegible con exactamente el 50% de participacion (limite inclusivo)', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({ joinedAt: new Date('2026-01-01') });
    prisma.groupCompetition.findMany.mockResolvedValue([{ competitionId: 'c1' }]);
    prisma.matchday.findMany.mockResolvedValue([
      { id: 'md-1' },
      { id: 'md-2' },
      { id: 'md-3' },
      { id: 'md-4' },
    ]);
    prisma.prediction.findMany.mockResolvedValue([
      { match: { matchdayId: 'md-1' } },
      { match: { matchdayId: 'md-2' } },
    ]);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeMemberEligibility('g1', 'u1');

    expect(result).toEqual({
      userId: 'u1',
      availableMatchdays: 4,
      participatedMatchdays: 2,
      eligible: true,
    });
  });

  it('no es elegible por debajo del 50%', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({ joinedAt: new Date('2026-01-01') });
    prisma.groupCompetition.findMany.mockResolvedValue([{ competitionId: 'c1' }]);
    prisma.matchday.findMany.mockResolvedValue([{ id: 'md-1' }, { id: 'md-2' }, { id: 'md-3' }]);
    prisma.prediction.findMany.mockResolvedValue([{ match: { matchdayId: 'md-1' } }]);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeMemberEligibility('g1', 'u1');

    expect(result.eligible).toBe(false);
    expect(result.participatedMatchdays).toBe(1);
    expect(result.availableMatchdays).toBe(3);
  });

  it('varios pronosticos en la misma jornada solo cuentan una vez (un pronostico basta para participar)', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findUnique.mockResolvedValue({ joinedAt: new Date('2026-01-01') });
    prisma.groupCompetition.findMany.mockResolvedValue([{ competitionId: 'c1' }]);
    // 3 jornadas disponibles: si "md-1" contase dos veces por tener dos pronosticos,
    // 2/3 seria >= 50% (eligible); deduplicado de verdad, solo cuenta 1 jornada de 3 (no elegible).
    prisma.matchday.findMany.mockResolvedValue([{ id: 'md-1' }, { id: 'md-2' }, { id: 'md-3' }]);
    prisma.prediction.findMany.mockResolvedValue([
      { match: { matchdayId: 'md-1' } },
      { match: { matchdayId: 'md-1' } }, // dos partidos distintos de la misma jornada
    ]);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeMemberEligibility('g1', 'u1');

    expect(result).toEqual({
      userId: 'u1',
      availableMatchdays: 3,
      participatedMatchdays: 1,
      eligible: false,
    });
  });
});

describe('EligibilityService.computeGroupEligibility', () => {
  it('calcula la elegibilidad de todos los miembros del grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    prisma.groupMembership.findUnique
      .mockResolvedValueOnce({ joinedAt: new Date('2026-01-01') })
      .mockResolvedValueOnce({ joinedAt: new Date('2026-01-01') });
    prisma.groupCompetition.findMany.mockResolvedValue([{ competitionId: 'c1' }]);
    prisma.matchday.findMany.mockResolvedValue([{ id: 'md-1' }, { id: 'md-2' }]);
    prisma.prediction.findMany
      .mockResolvedValueOnce([{ match: { matchdayId: 'md-1' } }, { match: { matchdayId: 'md-2' } }])
      .mockResolvedValueOnce([]);

    const service = new EligibilityService(prisma as never);
    const result = await service.computeGroupEligibility('g1');

    expect(result).toEqual([
      { userId: 'u1', availableMatchdays: 2, participatedMatchdays: 2, eligible: true },
      { userId: 'u2', availableMatchdays: 2, participatedMatchdays: 0, eligible: false },
    ]);
  });
});
