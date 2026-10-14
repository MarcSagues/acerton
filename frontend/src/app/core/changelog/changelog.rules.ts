import { ChangelogEntry } from './changelog';

/** "1.0.2" -> [1, 0, 2]; cualquier otra cosa (vacío, "1.0", "beta") -> null. */
export function parseVersion(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

/** Negativo si a < b, 0 si son iguales, positivo si a > b. Una versión no válida cuenta como la más antigua. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return pa ? 1 : pb ? -1 : 0;
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

/**
 * Última versión publicada SIN el pop-up de novedades (la 1.0.1). Quien abre la
 * app sin ninguna versión guardada y no es un usuario nuevo viene de esa o de
 * otra anterior, así que se le enseña todo lo que ha cambiado desde ella.
 */
export const LAST_VERSION_WITHOUT_WHATS_NEW = '1.0.1';

export type WhatsNewDecision =
  | { action: 'none' }
  /** Apuntar la versión como vista sin enseñar nada. */
  | { action: 'remember' }
  | { action: 'show'; entries: readonly ChangelogEntry[] };

export interface WhatsNewInput {
  changelog: readonly ChangelogEntry[];
  /** Versión instalada. */
  currentVersion: string;
  /** Última versión para la que ya se decidió (guardada en el dispositivo), o null si nunca. */
  lastSeenVersion: string | null;
  /** Usuario recién llegado (aún sin tutorial): no tiene sentido contarle "lo nuevo" de algo que ve por primera vez. */
  isNewUser: boolean;
}

/**
 * Qué hacer al abrir la app:
 * - misma versión que la última vez, o una más antigua (se reinstaló una build
 *   anterior): nada;
 * - nunca se decidió y es un usuario nuevo: apuntar la versión sin enseñar nada;
 * - versión nueva con novedades: enseñar las de todas las versiones entre la
 *   última vista (excluida) y la instalada (incluida), por si se saltó alguna.
 *   Sin última vista (se actualiza desde una versión sin este aviso) se cuenta
 *   desde LAST_VERSION_WITHOUT_WHATS_NEW;
 * - versión nueva sin ninguna entrada que enseñar: apuntarla y seguir.
 */
export function decideWhatsNew(input: WhatsNewInput): WhatsNewDecision {
  const { changelog, currentVersion, lastSeenVersion, isNewUser } = input;
  if (lastSeenVersion !== null) {
    if (compareVersions(currentVersion, lastSeenVersion) <= 0) return { action: 'none' };
  } else if (isNewUser) {
    return { action: 'remember' };
  }

  const since = lastSeenVersion ?? LAST_VERSION_WITHOUT_WHATS_NEW;
  const entries = changelog.filter(
    (entry) => compareVersions(entry.version, since) > 0 && compareVersions(entry.version, currentVersion) <= 0,
  );
  return entries.length > 0 ? { action: 'show', entries } : { action: 'remember' };
}
