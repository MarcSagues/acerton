import { ServiceUnavailableException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

function buildPrismaMock() {
  return {
    groupMembership: { findMany: jest.fn() },
    groupCompetition: { findMany: jest.fn().mockResolvedValue([]) },
    rankingSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
    prediction: { findMany: jest.fn() },
    notificationToken: {
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    notificationPreference: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({}),
      count: jest.fn().mockResolvedValue(0),
    },
    notification: {
      create: jest.fn().mockResolvedValue({}),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
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
    // El feed real (Notification) se persiste con el mismo cuerpo que el push, para cada destinatario.
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'MATCHDAY_FINISHED',
          body: expect.stringContaining('4 puntos'),
        }),
      }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u2',
          type: 'MATCHDAY_FINISHED',
          body: expect.stringContaining('0 puntos'),
        }),
      }),
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
    expect(prisma.notification.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 'u1' }) }),
    );
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
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', mutedNotifications: false },
    ]);
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
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'BADGE_EARNED',
          body: expect.stringContaining('Constante'),
        }),
      }),
    );
  });

  it('no avisa cuando el usuario ha desactivado la preferencia', async () => {
    const prisma = buildPrismaMock();
    prisma.notificationPreference.findUnique.mockResolvedValue({ badgeEarned: false });
    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyBadgeEarned('u1', 'Constante');

    expect(sendSpy).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.notifyLevelUp', () => {
  it('avisa cuando la preferencia esta activada (por defecto) y guarda el nivel', async () => {
    const prisma = buildPrismaMock();
    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyLevelUp('u1', 8);

    expect(sendSpy).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ body: expect.stringContaining('nivel 8') }),
    );
    expect(prisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', type: 'LEVEL_UP', level: 8 }),
      }),
    );
  });

  it('no avisa cuando el usuario ha desactivado la preferencia', async () => {
    const prisma = buildPrismaMock();
    prisma.notificationPreference.findUnique.mockResolvedValue({ levelUp: false });
    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUser').mockResolvedValue(undefined);

    await service.notifyLevelUp('u1', 8);

    expect(sendSpy).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.markOneRead', () => {
  it('marca leido solo el aviso pedido, filtrando tambien por dueño', async () => {
    const prisma = buildPrismaMock();
    const service = new NotificationsService(prisma as never, {} as never);

    await service.markOneRead('u1', 'n1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n1', userId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe('NotificationsService.notifyMatchesClosingSoon', () => {
  it('avisa a quien le falta el partido y no recibio otro recordatorio en las ultimas 24h', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', mutedNotifications: false },
    ]);
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.notificationPreference.findMany.mockResolvedValue([{ userId: 'u1', reminder1h: true }]);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', lastClosingReminderPushAt: null }]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUsers').mockResolvedValue(undefined);

    await service.notifyMatchesClosingSoon('g1', 'md1', 'J6', ['m1'], '1 hora', 'reminder1h');

    expect(sendSpy).toHaveBeenCalledWith(
      ['u1'],
      expect.objectContaining({ title: 'Partidos por pronosticar' }),
    );
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['u1'] } },
      data: { lastClosingReminderPushAt: expect.any(Date) },
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'u1',
          type: 'MATCHDAY_CLOSING_SOON',
          groupId: 'g1',
          matchdayId: 'md1',
        }),
      ],
    });
  });

  it('no avisa a quien ya recibio otro recordatorio de cierre hace menos de 24h', async () => {
    const prisma = buildPrismaMock();
    prisma.groupMembership.findMany.mockResolvedValue([
      { userId: 'u1', mutedNotifications: false },
    ]);
    prisma.prediction.findMany.mockResolvedValue([]);
    prisma.notificationPreference.findMany.mockResolvedValue([{ userId: 'u1', reminder1h: true }]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', lastClosingReminderPushAt: new Date(Date.now() - 60 * 60 * 1000) },
    ]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUsers').mockResolvedValue(undefined);

    await service.notifyMatchesClosingSoon('g1', 'md1', 'J6', ['m1'], '1 hora', 'reminder1h');

    expect(sendSpy).not.toHaveBeenCalled();
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});

describe('NotificationsService.notifyReengagement', () => {
  it('avisa solo a quien tiene activada la preferencia de reenganche', async () => {
    const prisma = buildPrismaMock();
    prisma.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u1', reengagement: true },
      { userId: 'u2', reengagement: false },
    ]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUsers').mockResolvedValue(undefined);

    await service.notifyReengagement(['u1', 'u2']);

    expect(sendSpy).toHaveBeenCalledWith(
      ['u1'],
      expect.objectContaining({ title: 'Piqo te echa de menos' }),
    );
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'u1', type: 'REENGAGEMENT' })],
    });
  });

  it('sin fila de preferencias (nunca visitadas), usa el valor por defecto (activado)', async () => {
    const prisma = buildPrismaMock();
    prisma.notificationPreference.findMany.mockResolvedValue([]);

    const service = new NotificationsService(prisma as never, {} as never);
    const sendSpy = jest.spyOn(service, 'sendToUsers').mockResolvedValue(undefined);

    await service.notifyReengagement(['u1']);

    expect(sendSpy).toHaveBeenCalledWith(['u1'], expect.anything());
  });
});

describe('NotificationsService.getFeedForUser', () => {
  const levelUp = (id: string, readAt: Date | null = null) => ({ id, type: 'LEVEL_UP', readAt });
  const closing = (id: string) => ({ id, type: 'MATCHDAY_CLOSING_SOON', readAt: null });

  function build(notices: unknown[]) {
    const prisma = buildPrismaMock();
    prisma.notification.findMany.mockResolvedValue(notices);
    return { prisma, service: new NotificationsService(prisma as never, {} as never) };
  }

  it('lista los avisos del usuario, mas recientes primero', async () => {
    const notices = [{ id: 'n1' }, { id: 'n2' }];
    const { prisma, service } = build(notices);

    const result = await service.getFeedForUser('u1');

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(result).toBe(notices);
  });

  it('devuelve el aviso de subida de nivel como sin leer esta vez y lo deja leido para la siguiente', async () => {
    const { prisma, service } = build([levelUp('l1'), closing('c1'), levelUp('l2')]);

    const result = await service.getFeedForUser('u1');

    expect(result.map((n) => [n.id, n.readAt])).toEqual([
      ['l1', null],
      ['c1', null],
      ['l2', null],
    ]);
    expect(prisma.notification.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', id: { in: ['l1', 'l2'] }, readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it('no toca los avisos de otros tipos ni los de nivel que ya estaban leidos', async () => {
    const { prisma, service } = build([closing('c1'), levelUp('l1', new Date())]);

    await service.getFeedForUser('u1');

    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it('un fallo al marcarlos no tumba el feed', async () => {
    const { prisma, service } = build([levelUp('l1')]);
    prisma.notification.updateMany.mockRejectedValue(new Error('BD caida'));

    await expect(service.getFeedForUser('u1')).resolves.toHaveLength(1);
  });
});

describe('NotificationsService.markAllRead', () => {
  it('marca como leidos solo los avisos sin leer de ese usuario', async () => {
    const prisma = buildPrismaMock();
    const service = new NotificationsService(prisma as never, {} as never);

    await service.markAllRead('u1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});

describe('NotificationsService.broadcastAnnouncement (envio a todo el mundo desde el dashboard)', () => {
  const announcement = { title: 'Novedades', body: 'Ya hay jornada nueva' };

  function build(devices: { token: string; userId: string }[], totalUsers = 10) {
    const prisma = buildPrismaMock();
    prisma.user.count.mockResolvedValue(totalUsers);
    prisma.notificationToken.findMany.mockResolvedValue(devices);
    const service = new NotificationsService(prisma as never, {} as never);
    const sendEachForMulticast = jest
      .fn()
      .mockImplementation(async ({ tokens }: { tokens: string[] }) => ({
        successCount: tokens.length,
        failureCount: 0,
        responses: tokens.map(() => ({ success: true })),
      }));
    (service as unknown as { messaging: unknown }).messaging = { sendEachForMulticast };
    return { service, prisma, sendEachForMulticast };
  }

  const devicesFor = (count: number) =>
    Array.from({ length: count }, (_, i) => ({ token: `t${i}`, userId: `u${i % 7}` }));

  it('dryRun solo cuenta destinatarios: no envia nada aunque Firebase este configurado', async () => {
    const { service, sendEachForMulticast } = build(devicesFor(9), 25);

    const result = await service.broadcastAnnouncement({ ...announcement, dryRun: true });

    expect(result).toEqual({
      dryRun: true,
      totalUsers: 25,
      usersWithDevices: 7,
      tokenCount: 9,
      successCount: 0,
      failureCount: 0,
      errors: {},
    });
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('envia titulo y texto a todos los dispositivos registrados', async () => {
    const { service, sendEachForMulticast } = build(devicesFor(3));

    const result = await service.broadcastAnnouncement(announcement);

    expect(sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['t0', 't1', 't2'],
      notification: { title: 'Novedades', body: 'Ya hay jornada nueva' },
      data: { type: 'ANNOUNCEMENT' },
    });
    expect(result).toMatchObject({
      dryRun: false,
      tokenCount: 3,
      successCount: 3,
      failureCount: 0,
    });
  });

  it('con mas de 500 dispositivos envia por lotes de 500 (limite de FCM)', async () => {
    const { service, sendEachForMulticast } = build(devicesFor(1200));

    const result = await service.broadcastAnnouncement(announcement);

    const sizes = sendEachForMulticast.mock.calls.map(
      ([arg]: [{ tokens: string[] }]) => arg.tokens.length,
    );
    expect(sizes).toEqual([500, 500, 200]);
    expect(result.successCount).toBe(1200);
    expect(result.tokenCount).toBe(1200);
  });

  it('suma los fallos de todos los lotes, los agrupa por codigo y borra los tokens invalidos', async () => {
    const { service, prisma, sendEachForMulticast } = build(devicesFor(4));
    sendEachForMulticast.mockResolvedValueOnce({
      successCount: 2,
      failureCount: 2,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });

    const result = await service.broadcastAnnouncement(announcement);

    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(2);
    expect(result.errors).toEqual({ 'messaging/registration-token-not-registered': 2 });
    expect(prisma.notificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['t1', 't3'] } },
    });
  });

  it('sin Firebase configurado falla (503) en vez de decir que se envio', async () => {
    const { service, sendEachForMulticast } = build(devicesFor(3));
    (service as unknown as { messaging: unknown }).messaging = null;

    await expect(service.broadcastAnnouncement(announcement)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('sin ningun dispositivo registrado no llama a Firebase y devuelve ceros', async () => {
    const { service, sendEachForMulticast } = build([], 12);

    const result = await service.broadcastAnnouncement(announcement);

    expect(sendEachForMulticast).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      totalUsers: 12,
      usersWithDevices: 0,
      tokenCount: 0,
      successCount: 0,
    });
  });
});
