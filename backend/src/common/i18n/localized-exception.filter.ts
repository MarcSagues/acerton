import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Request, Response } from 'express';
import { resolveLocale } from './locale';
import { translateErrorMessage } from './error-messages';

/**
 * Los servicios lanzan sus errores con el mensaje en espanol (el original), y
 * este filtro lo devuelve en el idioma de la peticion (Accept-Language) sin
 * tocar cada sitio donde se lanza. Mantiene el formato de respuesta de Nest
 * ({ statusCode, message, error }); un mensaje sin traduccion se devuelve tal
 * cual, y en espanol no cambia nada.
 */
@Catch(HttpException)
export class LocalizedExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    const locale = resolveLocale(request.headers['accept-language']);
    const payload: string | object =
      typeof body === 'string' ? { statusCode: status, message: body } : body;

    if (locale !== 'es' && typeof payload === 'object' && 'message' in payload) {
      const { message } = payload as { message: unknown };
      const translated = Array.isArray(message)
        ? message.map((entry) =>
            typeof entry === 'string' ? translateErrorMessage(entry, locale) : entry,
          )
        : typeof message === 'string'
          ? translateErrorMessage(message, locale)
          : message;
      response.status(status).json({ ...payload, message: translated });
      return;
    }

    response.status(status).json(payload);
  }
}
