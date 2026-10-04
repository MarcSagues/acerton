import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AdminApiKeyGuard } from './admin-api-key.guard';

const KEY = 'k'.repeat(40);

function buildGuard(apiKey: string) {
  const config = { get: jest.fn().mockReturnValue({ apiKey }) };
  return new AdminApiKeyGuard(config as never);
}

function contextWith(authorization?: string) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }),
  } as never;
}

describe('AdminApiKeyGuard', () => {
  it('deja pasar con la clave correcta en Authorization: Bearer', () => {
    expect(buildGuard(KEY).canActivate(contextWith(`Bearer ${KEY}`))).toBe(true);
  });

  it('rechaza (401) una clave incorrecta, sin cabecera o sin el prefijo Bearer', () => {
    const guard = buildGuard(KEY);
    expect(() => guard.canActivate(contextWith(`Bearer ${'x'.repeat(40)}`))).toThrow(
      UnauthorizedException,
    );
    expect(() => guard.canActivate(contextWith(undefined))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith(KEY))).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWith('Bearer '))).toThrow(UnauthorizedException);
  });

  it('rechaza una clave que solo coincide en el prefijo', () => {
    expect(() => buildGuard(KEY).canActivate(contextWith(`Bearer ${KEY.slice(0, 20)}`))).toThrow(
      UnauthorizedException,
    );
  });

  it('sin clave configurada el endpoint no existe (404), aunque se mande la cabecera vacia', () => {
    expect(() => buildGuard('').canActivate(contextWith('Bearer '))).toThrow(NotFoundException);
    expect(() => buildGuard('').canActivate(contextWith(undefined))).toThrow(NotFoundException);
  });

  it('una clave configurada demasiado corta cuenta como sin configurar (404)', () => {
    expect(() => buildGuard('corta').canActivate(contextWith('Bearer corta'))).toThrow(
      NotFoundException,
    );
  });
});
