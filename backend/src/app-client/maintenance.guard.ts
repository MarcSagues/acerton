import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AppConfig } from '../config/configuration';
import { AppClientInfo, compareVersions, parseAppClient } from './app-client';
import { ALLOW_DURING_MAINTENANCE_KEY } from './app-client.decorator';

export const MAINTENANCE_MESSAGE = 'Piqo está en mantenimiento. Vuelve a intentarlo en un rato.';

/**
 * Modo mantenimiento (MAINTENANCE_MODE=true): contesta 503 con
 * `maintenance: true` y la app enseña su pantalla de mantenimiento. Va detras
 * del JwtAuthGuard (ver AppModule) para conocer al usuario. Deja pasar:
 * - los endpoints con @AllowDuringMaintenance() (auth, /app-config, /dashboard);
 * - las plataformas que no estan en MAINTENANCE_PLATFORMS;
 * - la app nativa con version >= MAINTENANCE_ALLOW_MIN_VERSION (la que esta en
 *   revision en la tienda);
 * - los correos de MAINTENANCE_ALLOW_EMAILS (la cuenta demo del revisor).
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const maintenance = this.configService.get('maintenance', { infer: true });
    if (!maintenance.enabled) return true;

    const allowed = this.reflector.getAllAndOverride<boolean>(ALLOW_DURING_MAINTENANCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (allowed) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const client = parseAppClient(request.headers);
    if (
      !this.affects(client, maintenance.platforms) ||
      this.isAllowedVersion(client, maintenance.allowMinVersion) ||
      this.isAllowedUser(request.user, maintenance.allowEmails)
    ) {
      return true;
    }

    throw new ServiceUnavailableException({
      statusCode: 503,
      error: 'Service Unavailable',
      message: MAINTENANCE_MESSAGE,
      maintenance: true,
    });
  }

  /** La app sin cabeceras (1.1.0/1.1.1) es nativa: le afecta si le afecta a iOS o Android. */
  private affects(client: AppClientInfo, platforms: readonly string[]): boolean {
    if (client.platform === 'legacy') {
      return platforms.includes('ios') || platforms.includes('android');
    }
    return platforms.includes(client.platform);
  }

  private isAllowedVersion(client: AppClientInfo, allowMinVersion: string): boolean {
    if (!allowMinVersion || client.platform === 'web' || !client.version) return false;
    return compareVersions(client.version, allowMinVersion) >= 0;
  }

  private isAllowedUser(user: AuthenticatedUser | undefined, emails: readonly string[]): boolean {
    return !!user?.email && emails.includes(user.email.toLowerCase());
  }
}
