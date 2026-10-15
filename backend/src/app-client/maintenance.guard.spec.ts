import { ExecutionContext, ServiceUnavailableException } from '@nestjs/common';
import { MaintenanceGuard } from './maintenance.guard';

interface Maintenance {
  enabled: boolean;
  platforms: string[];
  allowMinVersion: string;
  allowEmails: string[];
}

const ON: Maintenance = {
  enabled: true,
  platforms: ['ios', 'android', 'web'],
  allowMinVersion: '',
  allowEmails: [],
};

function build(maintenance: Partial<Maintenance>, allowedEndpoint = false) {
  const configService = { get: jest.fn().mockReturnValue({ ...ON, ...maintenance }) };
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(allowedEndpoint) };
  return new MaintenanceGuard(reflector as never, configService as never);
}

function contextWith(headers: Record<string, string>, user?: { email: string }): ExecutionContext {
  return {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ headers, user }) }),
  } as unknown as ExecutionContext;
}

const ios = (version: string) => ({ 'x-app-platform': 'ios', 'x-app-version': version });

describe('MaintenanceGuard', () => {
  it('apagado, deja pasar a todo el mundo', () => {
    expect(build({ enabled: false }).canActivate(contextWith({}))).toBe(true);
  });

  it('encendido, contesta 503 con maintenance: true', () => {
    try {
      build({}).canActivate(contextWith(ios('1.1.2')));
      fail('deberia lanzar');
    } catch (error) {
      expect(error).toBeInstanceOf(ServiceUnavailableException);
      expect((error as ServiceUnavailableException).getResponse()).toMatchObject({
        maintenance: true,
      });
    }
  });

  it('deja pasar los endpoints marcados con @AllowDuringMaintenance()', () => {
    expect(build({}, true).canActivate(contextWith({}))).toBe(true);
  });

  it('deja pasar la version en revision y las posteriores, no las anteriores', () => {
    const guard = build({ allowMinVersion: '1.1.3' });
    expect(guard.canActivate(contextWith(ios('1.1.3')))).toBe(true);
    expect(guard.canActivate(contextWith(ios('1.2.0')))).toBe(true);
    expect(() => guard.canActivate(contextWith(ios('1.1.2')))).toThrow(ServiceUnavailableException);
    expect(() => guard.canActivate(contextWith({}))).toThrow(ServiceUnavailableException);
  });

  it('la web no pasa por version (siempre es la ultima), solo por correo', () => {
    const guard = build({ allowMinVersion: '1.1.3', allowEmails: ['review@piqo.es'] });
    const web = { 'x-app-platform': 'web', 'x-app-version': '9.0.0' };
    expect(() => guard.canActivate(contextWith(web))).toThrow(ServiceUnavailableException);
    expect(guard.canActivate(contextWith(web, { email: 'Review@Piqo.es' }))).toBe(true);
  });

  it('solo afecta a las plataformas elegidas; la app sin cabeceras cuenta como nativa', () => {
    const nativeOnly = build({ platforms: ['ios', 'android'] });
    expect(nativeOnly.canActivate(contextWith({ 'x-app-platform': 'web' }))).toBe(true);
    expect(() => nativeOnly.canActivate(contextWith({}))).toThrow(ServiceUnavailableException);

    const webOnly = build({ platforms: ['web'] });
    expect(webOnly.canActivate(contextWith({}))).toBe(true);
    expect(webOnly.canActivate(contextWith(ios('1.1.2')))).toBe(true);
  });
});
