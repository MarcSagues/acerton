import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { AppConfig } from '../../config/configuration';

/** Cabecera en la que piqo-dashboard envia la clave compartida. */
export const DASHBOARD_KEY_HEADER = 'x-dashboard-key';

/** Una clave mas corta se considera mal configurada: facil de adivinar por fuerza bruta. */
export const DASHBOARD_KEY_MIN_LENGTH = 32;

/**
 * Deja pasar solo las peticiones que traen la clave compartida con
 * piqo-dashboard (panel de administracion, proyecto aparte, que llama a la API
 * desde su propio servidor). Sustituye al JWT de usuario en los endpoints
 * /dashboard/*: van marcados con @Public() para saltarse el guard global y
 * este guard es el unico control de acceso.
 *
 * - Sin DASHBOARD_API_KEY (o demasiado corta) -> 503: el endpoint queda
 *   desactivado en vez de abierto. Nunca se acepta "sin clave".
 * - Comparacion en tiempo constante (hash de ambos lados para igualar longitud
 *   y no filtrar por tiempo cuantos caracteres coinciden).
 */
@Injectable()
export class DashboardApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(DashboardApiKeyGuard.name);

  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get('dashboard', { infer: true }).apiKey;
    if (!expected || expected.length < DASHBOARD_KEY_MIN_LENGTH) {
      this.logger.warn(
        `DASHBOARD_API_KEY sin configurar o de menos de ${DASHBOARD_KEY_MIN_LENGTH} caracteres: endpoints /dashboard/* desactivados`,
      );
      throw new ServiceUnavailableException('El acceso del dashboard no esta configurado');
    }

    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers[DASHBOARD_KEY_HEADER];
    if (typeof provided !== 'string' || !safeEqual(provided, expected)) {
      throw new ForbiddenException('Clave del dashboard invalida');
    }
    return true;
  }
}

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}
