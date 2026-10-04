import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { DashboardApiKeyGuard } from '../common/guards/dashboard-api-key.guard';
import { DashboardNotificationsController } from './dashboard-notifications.controller';
import { NotificationsController } from './notifications.controller';

describe('Proteccion de los endpoints de notificaciones', () => {
  it('el endpoint del dashboard usa la clave compartida como unico control de acceso', () => {
    // @Public() salta el JWT global; sin DashboardApiKeyGuard quedaria abierto a todo internet.
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, DashboardNotificationsController)).toBe(true);
    const guards = Reflect.getMetadata('__guards__', DashboardNotificationsController) as unknown[];
    expect(guards).toContain(DashboardApiKeyGuard);
  });

  it('el envio a todo el mundo es POST /dashboard/send-notification', () => {
    expect(Reflect.getMetadata('path', DashboardNotificationsController)).toBe('dashboard');
    const handler = DashboardNotificationsController.prototype.sendNotification;
    expect(Reflect.getMetadata('path', handler)).toBe('send-notification');
    expect(Reflect.getMetadata('method', handler)).toBe(1); // RequestMethod.POST
  });

  it('el antiguo POST /notifications/test-broadcast (lo podia lanzar cualquier usuario) ya no existe', () => {
    expect(
      (NotificationsController.prototype as unknown as Record<string, unknown>)['testBroadcast'],
    ).toBeUndefined();
  });

  it('el controlador normal de avisos no es publico ni usa la clave del dashboard', () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, NotificationsController)).toBeUndefined();
    expect(Reflect.getMetadata('__guards__', NotificationsController)).toBeUndefined();
  });
});
