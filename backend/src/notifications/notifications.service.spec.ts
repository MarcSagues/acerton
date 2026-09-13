import { NotificationsService } from './notifications.service';

function buildPrismaMock() {
  return {
    groupMembership: { findMany: jest.fn() },
    groupCompetition: { findMany: jest.fn().mockResolvedValue([]) },
    rankingSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
    prediction: { findMany: jest.fn() },
    notificationToken: { findMany: jest.fn() },
    notificationPreference: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn().mockResolvedValue(null) },
  };
}

describe('NotificationsService.notifyMatchdayFinished', () => {
  it('envia a cada miembro un mensaje personalizado con la suma de sus propios puntos de esa jornada', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }, { userId: 'u2' }]);
    prisma.prediction.findMany.mockResolvedValue([
      { userId: 'u1', pointsEarned: 3 },
      { userId: 'u1', pointsEarned: 1 },
      { userId: 'u2', pointsEarned: 0 },
    ]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyMatchdayFinished('g1', 'md1', 'J6');

    expect(sendSpy).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: expect.stringContaining('4 puntos') }),
    );
    expect(sendSpy).toHaveBeenCalledWith(
      'u2',
      expect.objectContaining({ body: expect.stringContaining('0 puntos') }),
    );
  });

  it('incluye a un miembro sin predicciones con 0 puntos, en vez de omitirlo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1' }]);
    prisma.prediction.findMany.mockResolvedValue([]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyMatchdayFinished('g1', 'md1', 'J6');

    expect(sendSpy).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: expect.stringContaining('0 puntos') }),
    );
  });

  it('no avisa a quien tiene silenciado el grupo', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', mutedNotifications: true },
      { userId: 'u2', mutedNotifications: false },
    ]);
    prisma.prediction.findMany.mockResolvedValue([]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyMatchdayFinished('g1', 'md1', 'J6');

    expect(sendSpy).not.toHaveBeenCalledWith('u1', expect.anything());
    expect(sendSpy).toHaveBeenCalledWith('u2', expect.anything());
  });

  it('no avisa a quien ha desactivado la preferencia de jornada terminada', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', mutedNotifications: false },
    ]);
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u1', matchdayFinishedResult: false },
    ]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyMatchdayFinished('g1', 'md1', 'J6');

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it('incluye la posicion cuando hay una foto de clasificacion reciente', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([{ userId: 'u1', mutedNotifications: false }]);
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.rankingSnapshot.findFirst.mockResolvedValue({ position: 2 });

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyMatchdayFinished('g1', 'md1', 'J6');

    expect(sendSpy).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: expect.stringContaining('Vas 2º en la clasificación') }),
    );
  });
});

describe('NotificationsService.notifyBadgeEarned', () => {
  it('avisa cuando la preferencia esta activada (por defecto)', async () => {
    const prisma = buildPrismaMock();
    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyBadgeEarned('u1', 'Constante');

    expect(sendSpy).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: expect.stringContaining('Constante') }),
    );
  });

  it('no avisa cuando el usuario ha desactivado la preferencia', async () => {
    const prisma = buildPrismaMock();
    prisma.notificationPreference.findUnique.mockResolvedValue({ badgeEarned: false });
    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyBadgeEarned('u1', 'Constante');

    expect(sendSpy).not.toHaveBeenCalled();
  });
});
