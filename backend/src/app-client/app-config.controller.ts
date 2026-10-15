import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../common/decorators/public.decorator';
import { AppConfig, NativePlatform } from '../config/configuration';
import { AllowDuringMaintenance } from './app-client.decorator';

export interface AppConfigResponse {
  /** Version minima por plataforma; null = sin minimo. */
  minVersion: Record<NativePlatform, string | null>;
  storeUrl: Record<NativePlatform, string>;
}

/** Lo que la app consulta al arrancar para saber si tiene que obligar a actualizar. */
@Public()
@AllowDuringMaintenance()
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  @Get()
  get(): AppConfigResponse {
    const { minVersion, storeUrl } = this.configService.get('appVersions', { infer: true });
    return {
      minVersion: { ios: minVersion.ios || null, android: minVersion.android || null },
      storeUrl,
    };
  }
}
