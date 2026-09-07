import { NotificationsService } from './notifications.service';

function buildPrismaMock() {
  return {
    groupMembership: { findMany: jest.fn() },
    prediction: { findMany: jest.fn() },
    notificationToken: { findMany: jest.fn() },
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
});
