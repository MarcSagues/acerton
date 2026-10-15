import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { CHANGELOG } from '../changelog/changelog';

export type AppPlatform = 'ios' | 'android' | 'web';

export interface AppClientInfo {
  platform: AppPlatform;
  version: string;
}

let info: Promise<AppClientInfo> | null = null;

/**
 * Plataforma y version de la app, para las cabeceras X-App-Platform y
 * X-App-Version (ver appClientInterceptor). En la app nativa, la version
 * instalada; en la web, la ultima del historial (se despliega a la vez que el
 * backend). Se calcula una vez: no cambia sin reiniciar la app.
 */
export function appClientInfo(): Promise<AppClientInfo> {
  info ??= loadInfo();
  return info;
}

async function loadInfo(): Promise<AppClientInfo> {
  const platform = Capacitor.getPlatform() as AppPlatform;
  const fallback = CHANGELOG[0]?.version ?? '0.0.0';
  if (!Capacitor.isNativePlatform()) return { platform: 'web', version: fallback };
  try {
    return { platform, version: (await App.getInfo()).version };
  } catch {
    return { platform, version: fallback };
  }
}

/** Compara MAYOR.MENOR.PARCHE: negativo si a < b, 0 si iguales, positivo si a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
