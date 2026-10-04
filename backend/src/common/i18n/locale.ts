import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Idiomas en los que el backend sabe contestar. El espanol es el original y el de reserva. */
export type Locale = 'es' | 'en';

/**
 * Idioma de la peticion segun su cabecera `Accept-Language`: el primero de la
 * lista, ingles solo si es ingles (en, en-GB, en-US...) y cualquier otro valor
 * —o ninguna cabecera, como en clientes antiguos o curl— se queda en espanol.
 * Mismo criterio que el cliente (frontend/src/app/core/i18n/translate.ts).
 */
export function resolveLocale(acceptLanguage: string | string[] | undefined): Locale {
  const header = Array.isArray(acceptLanguage) ? acceptLanguage[0] : acceptLanguage;
  const first = (header ?? '').split(',')[0]?.trim().toLowerCase() ?? '';
  return first === 'en' || first.startsWith('en-') ? 'en' : 'es';
}

interface RequestWithHeaders {
  headers: Record<string, string | string[] | undefined>;
}

/** Idioma de la peticion en curso (ver resolveLocale). */
export const RequestLocale = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Locale => {
    const request = ctx.switchToHttp().getRequest<RequestWithHeaders>();
    return resolveLocale(request.headers['accept-language']);
  },
);
