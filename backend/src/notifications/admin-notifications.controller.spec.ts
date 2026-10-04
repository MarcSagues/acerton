import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminApiKeyGuard } from './admin-api-key.guard';
import { AdminNotificationsController } from './admin-notifications.controller';
import { NotificationsService } from './notifications.service';

const KEY = 'k'.repeat(40);

/**
 * Prueba el cableado HTTP real (no solo el guard suelto): con el JwtAuthGuard
 * global activo, como en AppModule, el endpoint solo se alcanza si @Public()
 * lo salta, y el guard de clave decide el resto. Sin supertest: servidor en
 * un puerto libre y `fetch`.
 */
describe('AdminNotificationsController (HTTP)', () => {
  let app: INestApplication;
  let url: string;
  const sendAnnouncement = jest.fn();

  async function start(apiKey: string) {
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, load: [() => ({ admin: { apiKey } })] })],
      controllers: [AdminNotificationsController],
      providers: [
        AdminApiKeyGuard,
        { provide: NotificationsService, useValue: { sendAnnouncement } },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.setGlobalPrefix('api');
    await app.listen(0);
    url = `${await app.getUrl()}/api/admin/notifications/broadcast`;
  }

  const post = (body: unknown, authorization?: string) =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    sendAnnouncement.mockReset();
    sendAnnouncement.mockResolvedValue({ sent: true });
  });

  afterEach(async () => {
    await app.close();
  });

  it('con la clave correcta responde 200 y delega en el servicio con el cuerpo validado', async () => {
    await start(KEY);

    const res = await post(
      { title: '  Hola ', body: 'Novedades', userIds: ['u1'] },
      `Bearer ${KEY}`,
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(sendAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Hola', body: 'Novedades', userIds: ['u1'] }),
    );
  });

  it('sin clave o con clave incorrecta responde 401 y no envia nada', async () => {
    await start(KEY);

    expect((await post({ title: 'x', body: 'x' })).status).toBe(401);
    expect((await post({ title: 'x', body: 'x' }, 'Bearer otra-clave')).status).toBe(401);
    expect(sendAnnouncement).not.toHaveBeenCalled();
  });

  it('sin ADMIN_API_KEY configurada responde 404 aunque se mande una cabecera', async () => {
    await start('');

    expect((await post({ title: 'x', body: 'x' }, 'Bearer ')).status).toBe(404);
    expect(sendAnnouncement).not.toHaveBeenCalled();
  });

  it('con la clave correcta pero un cuerpo invalido responde 400 y no envia nada', async () => {
    await start(KEY);

    expect((await post({ title: '', body: 'x' }, `Bearer ${KEY}`)).status).toBe(400);
    expect((await post({ title: 'x', body: 'x', userIds: [] }, `Bearer ${KEY}`)).status).toBe(400);
    expect(sendAnnouncement).not.toHaveBeenCalled();
  });

  it('un JWT de usuario normal no sirve como clave de administracion', async () => {
    await start(KEY);

    const res = await post({ title: 'x', body: 'x' }, 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.firma');

    expect(res.status).toBe(401);
    expect(sendAnnouncement).not.toHaveBeenCalled();
  });
});
