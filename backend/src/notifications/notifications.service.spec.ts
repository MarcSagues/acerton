import { NotificationsService } from './notifications.service';

function buildPrismaMock() {
  return {
    groupMembership: { findMany: jest.fn() },
    groupCompetition: { findMany: jest.fn().mockResolvedValue([]) },
    rankingSnapshot: { findFirst: jest.fn().mockResolvedValue(null) },
    prediction: { findMany: jest.fn() },
    notificationToken: { findMany: jest.fn() },
    notificationPreference: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({}),
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
  it('lista los avisos del usuario, mas recientes primero', async () => {
    const prisma = buildPrismaMock();
    const notices = [{ id: 'n1' }, { id: 'n2' }];
    prisma.notification.findMany.mockResolvedValue(notices);

    const service = new NotificationsService(prisma as never, {} as never);
    const result = await service.getFeedForUser('u1');

    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    expect(result).toBe(notices);
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

/** Firebase falso: cada llamada a sendEachForMulticast responde "ok" para todos sus tokens salvo los indicados como invalidos. */
function buildMessagingMock(invalidTokens: string[] = []) {
  return {
    sendEachForMulticast: jest.fn(async ({ tokens }: { tokens: string[] }) => {
      const responses = tokens.map((token) =>
        invalidTokens.includes(token)
          ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
          : { success: true },
      );
      return {
        responses,
        successCount: responses.filter((r) => r.success).length,
        failureCount: responses.filter((r) => !r.success).length,
      };
    }),
  };
}

describe('NotificationsService.sendAnnouncement', () => {
  function build(options: { withFirebase?: boolean; invalidTokens?: string[] } = {}) {
    const prisma = buildPrismaMock() as ReturnType<typeof buildPrismaMock> & {
      notificationToken: { findMany: jest.Mock; deleteMany: jest.Mock };
    };
    prisma.notificationToken.deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const service = new NotificationsService(prisma as never, {} as never);
    const messaging = buildMessagingMock(options.invalidTokens);
    if (options.withFirebase ?? true) {
      (service as unknown as { messaging: unknown }).messaging = messaging;
    }
    return { prisma, service, messaging };
  }

  it('sin userIds llega a todos los usuarios y a todos los dispositivos', async () => {
    const { prisma, service, messaging } = build();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }, { id: 'u3' }]);
    prisma.notificationToken.findMany.mockResolvedValue([
      { userId: 'u1', token: 't1a' },
      { userId: 'u1', token: 't1b' },
      { userId: 'u2', token: 't2' },
    ]);

    const result = await service.sendAnnouncement({ title: 'Hola', body: 'Novedades' });

    expect(prisma.user.findMany).toHaveBeenCalledWith({ where: {}, select: { id: true } });
    expect(prisma.notificationToken.findMany).toHaveBeenCalledWith({
      where: {},
      select: { userId: true, token: true },
    });
    expect(messaging.sendEachForMulticast).toHaveBeenCalledTimes(1);
    expect(messaging.sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['t1a', 't1b', 't2'],
      notification: { title: 'Hola', body: 'Novedades' },
      data: { type: 'ANNOUNCEMENT' },
    });
    expect(result).toEqual({
      userCount: 3,
      usersWithPush: 2,
      tokenCount: 3,
      sent: true,
      successCount: 3,
      failureCount: 0,
      errors: [],
    });
  });

  it('con userIds limita usuarios y dispositivos a esa lista', async () => {
    const { prisma, service } = build();
    prisma.user.findMany.mockResolvedValue([{ id: 'u2' }]);
    prisma.notificationToken.findMany.mockResolvedValue([{ userId: 'u2', token: 't2' }]);

    await service.sendAnnouncement({ title: 'Hola', body: 'Solo para ti', userIds: ['u2'] });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['u2'] } },
      select: { id: true },
    });
    expect(prisma.notificationToken.findMany).toHaveBeenCalledWith({
      where: { userId: { in: ['u2'] } },
      select: { userId: true, token: true },
    });
  });

  it('guarda el aviso en el feed de todos los destinatarios, tengan o no dispositivo', async () => {
    const { prisma, service } = build();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.notificationToken.findMany.mockResolvedValue([{ userId: 'u1', token: 't1' }]);

    await service.sendAnnouncement({ title: 'Hola', body: 'Novedades' });

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u1', type: 'ANNOUNCEMENT', title: 'Hola', body: 'Novedades' },
        { userId: 'u2', type: 'ANNOUNCEMENT', title: 'Hola', body: 'Novedades' },
      ],
    });
  });

  it('dryRun solo cuenta: no llama a Firebase ni escribe en el feed', async () => {
    const { prisma, service, messaging } = build();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.notificationToken.findMany.mockResolvedValue([{ userId: 'u1', token: 't1' }]);

    const result = await service.sendAnnouncement({ title: 'Hola', body: 'x', dryRun: true });

    expect(result).toEqual({
      userCount: 2,
      usersWithPush: 1,
      tokenCount: 1,
      sent: false,
      successCount: 0,
      failureCount: 0,
      errors: [],
    });
    expect(messaging.sendEachForMulticast).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('dryRun funciona aunque Firebase no este configurado', async () => {
    const { prisma, service } = build({ withFirebase: false });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.notificationToken.findMany.mockResolvedValue([]);

    await expect(
      service.sendAnnouncement({ title: 'Hola', body: 'x', dryRun: true }),
    ).resolves.toMatchObject({ sent: false });
  });

  it('sin Firebase configurado falla con 503 en vez de parecer un envio con 0 entregas, y no escribe en el feed', async () => {
    const { prisma, service } = build({ withFirebase: false });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.notificationToken.findMany.mockResolvedValue([{ userId: 'u1', token: 't1' }]);

    await expect(service.sendAnnouncement({ title: 'Hola', body: 'x' })).rejects.toThrow(
      /Firebase no esta configurado/,
    );
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('cuenta los fallos y borra los tokens que Firebase da por invalidos', async () => {
    const { prisma, service } = build({ invalidTokens: ['t2'] });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    prisma.notificationToken.findMany.mockResolvedValue([
      { userId: 'u1', token: 't1' },
      { userId: 'u2', token: 't2' },
    ]);

    const result = await service.sendAnnouncement({ title: 'Hola', body: 'x' });

    expect(result).toMatchObject({
      successCount: 1,
      failureCount: 1,
      errors: ['messaging/registration-token-not-registered'],
    });
    expect(prisma.notificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['t2'] } },
    });
  });

  it('manda por tandas de 500 dispositivos (limite de FCM) y borra el token invalido correcto de cualquier tanda', async () => {
    const tokens = Array.from({ length: 1203 }, (_, i) => `t${i}`);
    const { prisma, service, messaging } = build({ invalidTokens: ['t700'] });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    prisma.notificationToken.findMany.mockResolvedValue(
      tokens.map((token) => ({ userId: 'u1', token })),
    );

    const result = await service.sendAnnouncement({ title: 'Hola', body: 'x' });

    const batchSizes = messaging.sendEachForMulticast.mock.calls.map(
      ([arg]: [{ tokens: string[] }]) => arg.tokens.length,
    );
    expect(batchSizes).toEqual([500, 500, 203]);
    expect(result).toMatchObject({ tokenCount: 1203, successCount: 1202, failureCount: 1 });
    expect(prisma.notificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: { in: ['t700'] } },
    });
  });
});
