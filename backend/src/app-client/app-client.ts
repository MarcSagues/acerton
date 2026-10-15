import { AppPlatform } from '../config/configuration';

/**
 * Que app hace la peticion, segun las cabeceras X-App-Platform y X-App-Version
 * que manda el frontend desde la 1.1.2 (ver appVersionInterceptor). Las
 * peticiones sin cabeceras solo pueden venir de la app nativa 1.1.0/1.1.1 (la
 * web las manda siempre): esas son `legacy`, sin version conocida.
 */
export interface AppClientInfo {
  platform: AppPlatform | 'legacy';
  version: string | null;
}

export const APP_VERSION_HEADER = 'x-app-version';
export const APP_PLATFORM_HEADER = 'x-app-platform';

const PLATFORMS: readonly AppPlatform[] = ['ios', 'android', 'web'];
const VERSION_PATTERN = /^\d+(\.\d+){0,2}$/;

/**
 * Versiones de la app nativa a partir de las que existe cada funcion nueva del
 * backend. Mientras haya versiones anteriores en la calle, el backend sigue
 * contestando lo de antes a quien no llegue (`appSupports(client, APP_FEATURES.x)`):
 * asi se puede desplegar el backend antes de que la tienda apruebe la app, y el
 * revisor ve la funcion nueva sin que la vean (rota) los usuarios de la version
 * anterior. Ejemplo: `quizV2: '1.1.3'`.
 */
export const APP_FEATURES = {} as const satisfies Record<string, string>;

type Headers = Record<string, string | string[] | undefined>;

function header(headers: Headers, name: string): string | undefined {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() || undefined;
}

export function parseAppClient(headers: Headers): AppClientInfo {
  const platform = header(headers, APP_PLATFORM_HEADER)?.toLowerCase();
  const version = header(headers, APP_VERSION_HEADER);
  if (!platform || !PLATFORMS.includes(platform as AppPlatform)) {
    return { platform: 'legacy', version: null };
  }
  return {
    platform: platform as AppPlatform,
    version: version && VERSION_PATTERN.test(version) ? version : null,
  };
}

/** Compara MAYOR.MENOR.PARCHE: negativo si a < b, 0 si iguales, positivo si a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Si la app que llama ya entiende algo que existe desde `minVersion`. La web
 * siempre si (se despliega a la vez que el backend); la app sin cabeceras
 * (1.1.0/1.1.1) o con una version ilegible, no.
 */
export function appSupports(client: AppClientInfo, minVersion: string): boolean {
  if (client.platform === 'web') return true;
  if (!client.version) return false;
  return compareVersions(client.version, minVersion) >= 0;
}
