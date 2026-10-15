import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';
import { AppClientInfo, parseAppClient } from './app-client';

/** La app que hace la peticion (plataforma y version), para `appSupports`. */
export const AppClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AppClientInfo =>
    parseAppClient(ctx.switchToHttp().getRequest<Request>().headers),
);

export const ALLOW_DURING_MAINTENANCE_KEY = 'allowDuringMaintenance';

/** Endpoints que siguen abiertos en modo mantenimiento (ver MaintenanceGuard). */
export const AllowDuringMaintenance = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(ALLOW_DURING_MAINTENANCE_KEY, true);
