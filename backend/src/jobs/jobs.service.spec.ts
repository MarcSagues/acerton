import { JobsService } from './jobs.service';

function buildDeps() {
  const prisma = {
    matchday: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    groupCompetition: { findMany: jest.fn() },
  };
  const matchdaysService = {
    syncCurrentRound: jest.fn(),
    syncResultsForClosedMatchdays: jest.fn(),
    closeDueMatchdays: jest.fn(),
  };
  const predictionsService = { scoreFinishedMatchday: jest.fn() };
  const rankingsService = { computeForFinishedMatchday: jest.fn() };
  const streaksService = { updateAfterMatchdayClose: jest.fn() };
  const badgesService = { evaluateAfterMatchdayClose: jest.fn().mockResolvedValue([]) };
  const notificationsService = {
    notifyMatchdayClosingSoon: jest.fn(),
    notifyMatchdayFinished: jest.fn(),
    notifyBadgeEarned: jest.fn(),
  };
  const seasonsService = { checkSeasonClosureAfterMatchdayFinished: jest.fn() };

  const service = new JobsService(
    prisma as never,
    matchdaysService as never,
    predictionsService as never,
    rankingsService as never,
    streaksService as never,
    badgesService as never,
    notificationsService as never,
    seasonsService as never,
  );

  return {
    service,
    prisma,
    matchdaysService,
    predictionsService,
    rankingsService,
    streaksService,
    badgesService,
    notificationsService,
    seasonsService,
  };
}

describe('JobsService.onApplicationBootstrap', () => {
  it('cierra jornadas vencidas y sincroniza resultados al arrancar, sin esperar al primer tick del cron', async () => {
    const { service, matchdaysService, predictionsService, rankingsService } = buildDeps();
    matchdaysService.closeDueMatchdays.mockResolvedValue([]);
    matchdaysService.syncResultsForClosedMatchdays.mockResolvedValue({
      newlyFinished: [],
      inProgress: ['md-live'],
    });

    await service.onApplicationBootstrap();

    expect(matchdaysService.closeDueMatchdays).toHaveBeenCalled();
    expect(matchdaysService.syncResultsForClosedMatchdays).toHaveBeenCalled();
    expect(predictionsService.scoreFinishedMatchday).toHaveBeenCalledWith('md-live');
    expect(rankingsService.computeForFinishedMatchday).toHaveBeenCalledWith('md-live');
  });
});

describe('JobsService.syncResultsAndFinalize', () => {
  it('puntua y recalcula clasificacion para jornadas en curso sin tocar rachas/insignias/notificaciones', async () => {
    const { service, matchdaysService, predictionsService, rankingsService, streaksService, badgesService, notificationsService } =
      buildDeps();
    matchdaysService.syncResultsForClosedMatchdays.mockResolvedValue({
      newlyFinished: [],
      inProgress: ['md-live'],
    });

    await service.syncResultsAndFinalize();

    expect(predictionsService.scoreFinishedMatchday).toHaveBeenCalledWith('md-live');
    expect(rankingsService.computeForFinishedMatchday).toHaveBeenCalledWith('md-live');
    expect(streaksService.updateAfterMatchdayClose).not.toHaveBeenCalled();
    expect(badgesService.evaluateAfterMatchdayClose).not.toHaveBeenCalled();
    expect(notificationsService.notifyMatchdayFinished).not.toHaveBeenCalled();
  });

  it('para jornadas recien terminadas del todo, ademas puntua/clasifica, dispara rachas e insignias', async () => {
    const {
      service,
      prisma,
      matchdaysService,
      predictionsService,
      rankingsService,
      streaksService,
      badgesService,
      notificationsService,
    } = buildDeps();
    matchdaysService.syncResultsForClosedMatchdays.mockResolvedValue({
      newlyFinished: ['md-done'],
      inProgress: [],
    });
    prisma.matchday.findUnique.mockResolvedValue({ id: 'md-done', competitionId: 'comp-1', name: 'Jornada 1' });
    prisma.groupCompetition.findMany.mockResolvedValue([{ groupId: 'group-1' }]);

    await service.syncResultsAndFinalize();

    expect(predictionsService.scoreFinishedMatchday).toHaveBeenCalledWith('md-done');
    expect(rankingsService.computeForFinishedMatchday).toHaveBeenCalledWith('md-done');
    expect(streaksService.updateAfterMatchdayClose).toHaveBeenCalledWith('md-done');
    expect(badgesService.evaluateAfterMatchdayClose).toHaveBeenCalledWith('group-1', 'md-done');
    expect(notificationsService.notifyMatchdayFinished).toHaveBeenCalledWith('group-1', 'md-done', 'Jornada 1');
  });
});

describe('JobsService.sendClosingReminders', () => {
  it('manda solo el aviso de la franja cuyo margen coincide, con la preferencia de esa franja', async () => {
    const { service, prisma, notificationsService } = buildDeps();
    const now = new Date('2026-01-01T00:00:00.000Z');
    jest.useFakeTimers().setSystemTime(now);

    const matchday = {
      id: 'md-1',
      name: 'Jornada 1',
      status: 'OPEN',
      competitionId: 'comp-1',
      // Cierra en 23h: dentro de la ventana de 24h, fuera de las de 5h/1h/30min.
      closesAt: new Date(now.getTime() + 23 * 60 * 60 * 1000),
      reminder24hSentAt: null,
      reminder5hSentAt: null,
      reminder1hSentAt: null,
      reminder30mSentAt: null,
    };
    prisma.matchday.findMany.mockResolvedValue([matchday]);
    prisma.groupCompetition.findMany.mockResolvedValue([{ groupId: 'group-1' }]);

    await service.sendClosingReminders();

    expect(notificationsService.notifyMatchdayClosingSoon).toHaveBeenCalledTimes(1);
    expect(notificationsService.notifyMatchdayClosingSoon).toHaveBeenCalledWith(
      'group-1',
      'md-1',
      'Jornada 1',
      '24 horas',
      'reminder24h',
    );
    expect(prisma.matchday.update).toHaveBeenCalledWith({
      where: { id: 'md-1' },
      data: { reminder24hSentAt: now },
    });

    jest.useRealTimers();
  });
});
