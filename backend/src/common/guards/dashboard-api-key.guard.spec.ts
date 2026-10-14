import { ExecutionContext, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { DashboardApiKeyGuard } from './dashboard-api-key.guard';

const KEY = 'k'.repeat(40);

function build(apiKey: string) {
  const configService = { get: jest.fn().mockReturnValue({ apiKey }) };
  return new DashboardApiKeyGuard(configService as never);
}

function contextWith(headers: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('DashboardApiKeyGuard', () => {
  it('deja pasar con la clave correcta', () => {
    expect(build(KEY).canActivate(contextWith({ 'x-dashboard-key': KEY }))).toBe(true);
  });

  it('rechaza (403) una clave incorrecta, aunque sea casi igual', () => {
    const guard = build(KEY);
    expect(() =>
      guard.canActivate(contextWith({ 'x-dashboard-key': KEY.slice(0, -1) + 'x' })),
    ).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWith({ 'x-dashboard-key': KEY + 'x' }))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza (403) si falta la cabecera o no es un texto simple', () => {
    const guard = build(KEY);
    expect(() => guard.canActivate(contextWith({}))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(contextWith({ 'x-dashboard-key': '' }))).toThrow(
      ForbiddenException,
    );
    expect(() => guard.canActivate(contextWith({ 'x-dashboard-key': [KEY, KEY] }))).toThrow(
      ForbiddenException,
    );
  });

  it('un Bearer de usuario no vale como clave del dashboard', () => {
    expect(() => build(KEY).canActivate(contextWith({ authorization: `Bearer ${KEY}` }))).toThrow(
      ForbiddenException,
    );
  });

  it('sin DASHBOARD_API_KEY queda desactivado (503), nunca abierto', () => {
    const guard = build('');
    expect(() => guard.canActivate(contextWith({ 'x-dashboard-key': '' }))).toThrow(
      ServiceUnavailableException,
    );
    expect(() => guard.canActivate(contextWith({}))).toThrow(ServiceUnavailableException);
  });

  it('una clave configurada demasiado corta tambien deja el endpoint desactivado (503)', () => {
    const guard = build('corta');
    expect(() => guard.canActivate(contextWith({ 'x-dashboard-key': 'corta' }))).toThrow(
      ServiceUnavailableException,
    );
  });
});
