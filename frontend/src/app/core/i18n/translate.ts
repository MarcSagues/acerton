import { es } from './es';
import { en } from './en';

/**
 * Traducciones de la interfaz. `es.ts` es la fuente (el idioma original de la
 * app) y define las claves; `en.ts` esta tipado como `Catalog`, asi que si
 * falta una clave —o sobra— no compila.
 *
 * Es TypeScript puro (sin Angular) a proposito: lo usan tambien las reglas de
 * dominio y las constantes de modulo, que se evaluan al importar. Por eso el
 * idioma se decide una sola vez al cargar este modulo y cambiarlo recarga la
 * app (ver I18nService.setLanguage): un unico estado, sin tener que
 * reaccionar a cambios de idioma en caliente.
 */
export type Lang = 'es' | 'en';
export const SUPPORTED_LANGS: readonly Lang[] = ['es', 'en'];
export const LANG_STORAGE_KEY = 'acerton.lang';

export type TranslationKey = keyof typeof es;
/** Un valor nulo o ausente se pinta vacio, igual que `{{ null }}` en una plantilla. */
export type Params = Record<string, string | number | null | undefined>;
/** Con `{ one, other }` se elige segun el parametro `count` (1 -> one). */
export type PluralMessage = { one: string; other: string };
export type Message = string | PluralMessage;
export type Catalog = Record<TranslationKey, Message>;

const CATALOGS: Record<Lang, Catalog> = { es, en };

/**
 * Idioma guardado por el usuario; si no hay, el primero preferido del
 * dispositivo: ingles solo si es ingles, y cualquier otro (incluidos catalan,
 * gallego o euskera) se queda en espanol, que es el idioma principal de la app.
 */
export function detectLanguage(stored: string | null | undefined, preferred: readonly string[]): Lang {
  if (stored === 'es' || stored === 'en') return stored;
  return (preferred[0] ?? '').toLowerCase().startsWith('en') ? 'en' : 'es';
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

/** Locale de Intl / DatePipe para el idioma actual (en-GB: dia/mes, como el espanol). */
export function currentLocale(): string {
  return current === 'en' ? 'en-GB' : 'es-ES';
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
  const message: Message = CATALOGS[current][key] ?? CATALOGS.es[key] ?? key;
  const text = typeof message === 'string' ? message : message[pluralCategory(params?.['count'])];
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) => (name in params ? String(params[name] ?? '') : placeholder));
}

/** Los dos catalogos, para los tests de coherencia entre idiomas. */
export const CATALOGS_FOR_TESTS = CATALOGS;
