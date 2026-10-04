import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { Request } from 'express';
import { AppConfig } from '../config/configuration';

/** Por debajo de esto la clave se considera "sin configurar" (ver ADMIN_API_KEY en .env.example). */
export const ADMIN_API_KEY_MIN_LENGTH = 32;

/**
 * Protege los endpoints que solo debe llamar el dashboard de administracion
 * (dashboard.piqo.es, otro servicio): no hay usuario ni JWT de por medio, asi
 * que se usa una clave compartida en `Authorization: Bearer <clave>`. Los
 * controllers que lo usan van ademas con @Public() para saltarse el
 * JwtAuthGuard global.
 *
 * Sin clave configurada (o demasiado corta) responde 404 en vez de 401: asi
 * un despliegue al que se le olvido la variable no queda abierto ni delata
 * que el endpoint existe.
 */
@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const { apiKey } = this.configService.get('admin', { infer: true });
    if (apiKey.length < ADMIN_API_KEY_MIN_LENGTH) throw new NotFoundException();

    const header = context.switchToHttp().getRequest<Request>().headers.authorization ?? '';
    const provided = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
    if (!this.safeEqual(provided, apiKey)) throw new UnauthorizedException();
    return true;
  }

  /** Compara hashes (misma longitud siempre) para no filtrar la longitud de la clave por tiempos de respuesta. */
  private safeEqual(a: string, b: string): boolean {
    const hash = (value: string) => createHash('sha256').update(value).digest();
    return timingSafeEqual(hash(a), hash(b));
  }
}
