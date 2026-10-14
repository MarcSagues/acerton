import { es } from './es';

/**
 * Traducciones de la interfaz. `es.ts` es la fuente (el idioma original de la
 * app) y define las claves; el resto (en, ca, fr, it, de) estan tipados como
 * `Catalog`, asi que si falta una clave —o sobra— no compila.
 *
 * Es TypeScript puro (sin Angular) a proposito: lo usan tambien las reglas de
 * dominio y las constantes de modulo, que se evaluan al importar. Por eso el
 * idioma se decide una sola vez al cargar este modulo y cambiarlo recarga la
 * app (ver I18nService.setLanguage): un unico estado, sin tener que
 * reaccionar a cambios de idioma en caliente.
 *
 * Solo el espanol va en el paquete inicial: el catalogo del idioma elegido se
 * descarga antes de arrancar la app (ver language-loader.ts) y se registra con
 * `registerCatalog`, asi que cuando se evalua cualquier modulo de la app ya esta.
 */
export type Lang = 'es' | 'en' | 'ca' | 'fr' | 'it' | 'de';
export const SUPPORTED_LANGS: readonly Lang[] = ['es', 'en', 'ca', 'fr', 'it', 'de'];
export const LANG_STORAGE_KEY = 'acerton.lang';

export type TranslationKey = keyof typeof es;
/** Un valor nulo o ausente se pinta vacio, igual que `{{ null }}` en una plantilla. */
export type Params = Record<string, string | number | null | undefined>;
/** Con `{ one, other }` se elige segun el parametro `count` (1 -> one). */
export type PluralMessage = { one: string; other: string };
export type Message = string | PluralMessage;
export type Catalog = Record<TranslationKey, Message>;

const CATALOGS: Partial<Record<Lang, Catalog>> = { es };

/** Registra el catalogo de un idioma ya descargado (ver language-loader.ts; los tests registran todos). */
export function registerCatalog(lang: Lang, catalog: Catalog): void {
  CATALOGS[lang] = catalog;
}

/** El catalogo de un idioma, si esta registrado. */
export function catalogOf(lang: Lang): Catalog | undefined {
  return CATALOGS[lang];
}

const isSupported = (code: string): code is Lang => (SUPPORTED_LANGS as readonly string[]).includes(code);

/**
 * Idioma guardado por el usuario; si no hay, el primero preferido del
 * dispositivo (en, ca, fr, it, de o es, con cualquier region: fr-CH, de-AT...);
 * cualquier otro (gallego, euskera, portugues...) se queda en espanol, que es el
 * idioma principal de la app.
 */
export function detectLanguage(stored: string | null | undefined, preferred: readonly string[]): Lang {
  if (stored && isSupported(stored)) return stored;
  const primary = (preferred[0] ?? '').toLowerCase().split(/[-_]/)[0];
  return isSupported(primary) ? primary : 'es';
}

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    return null;
  }
}

function devicePreferredLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language];
}

let current: Lang = detectLanguage(readStoredLanguage(), devicePreferredLanguages());

export function currentLang(): Lang {
  return current;
}

/** Locale de Intl / DatePipe de cada idioma (en-GB: dia/mes, como el espanol). */
const LOCALES: Record<Lang, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };

/** Locale de Intl / DatePipe para el idioma actual. */
export function currentLocale(): string {
  return LOCALES[current];
}

/** Guarda la eleccion para el proximo arranque. No cambia el idioma en caliente: ver I18nService.setLanguage. */
export function storeLanguage(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // Sin storage: la eleccion solo dura esta sesion.
  }
}

/** Solo para tests: fija el idioma sin recargar. */
export function setLanguageForTests(lang: Lang): void {
  current = lang;
}

function pluralCategory(count: unknown): 'one' | 'other' {
  const n = Number(count);
  return Number.isFinite(n) && new Intl.PluralRules(currentLocale()).select(n) === 'one' ? 'one' : 'other';
}

export function t(key: TranslationKey, params?: Params): string {
  const message: Message = CATALOGS[current]?.[key] ?? es[key] ?? key;
  const text = typeof message === 'string' ? message : message[pluralCategory(params?.['count'])];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in params ? String(params[name] ?? '') : placeholder));
}
