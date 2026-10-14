import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
} from '@nestjs/common';
import { LocalizedExceptionFilter } from './localized-exception.filter';

function run(exception: HttpException, acceptLanguage?: string): { status: number; body: unknown } {
  let result: { status: number; body: unknown } = { status: 0, body: undefined };
  const response = {
    status: (status: number) => ({
      json: (body: unknown) => {
        result = { status, body };
      },
    }),
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: acceptLanguage === undefined ? {} : { 'accept-language': acceptLanguage },
      }),
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;
  new LocalizedExceptionFilter().catch(exception, host);
  return result;
}

describe('LocalizedExceptionFilter', () => {
  it('en ingles traduce el mensaje y conserva el formato de Nest', () => {
    const { status, body } = run(
      new ForbiddenException('No perteneces a este grupo'),
      'en-GB,en;q=0.9',
    );
    expect(status).toBe(403);
    expect(body).toEqual({
      statusCode: 403,
      message: "You don't belong to this group",
      error: 'Forbidden',
    });
  });

  it('en espanol, o sin cabecera, no cambia nada', () => {
    const original = { statusCode: 403, message: 'No perteneces a este grupo', error: 'Forbidden' };
    expect(run(new ForbiddenException('No perteneces a este grupo'), 'es-ES').body).toEqual(
      original,
    );
    expect(run(new ForbiddenException('No perteneces a este grupo')).body).toEqual(original);
  });

  it('traduce cada mensaje de una lista de validacion y deja los que no conoce', () => {
    const { body } = run(
      new BadRequestException([
        'La contraseña debe tener al menos 8 caracteres',
        'email must be an email',
      ]),
      'en',
    );
    expect(body).toMatchObject({
      message: ['The password must be at least 8 characters long', 'email must be an email'],
    });
  });

  it('una excepcion con el cuerpo como texto sale como { statusCode, message }', () => {
    expect(run(new HttpException('Usuario no encontrado', 404), 'en').body).toEqual({
      statusCode: 404,
      message: 'User not found',
    });
    expect(run(new HttpException('Usuario no encontrado', 404)).body).toEqual({
      statusCode: 404,
      message: 'Usuario no encontrado',
    });
  });
});
