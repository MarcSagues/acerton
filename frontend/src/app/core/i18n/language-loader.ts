import { registerLocaleData } from '@angular/common';
import { Catalog, Lang, currentLang, currentLocale, registerCatalog } from './translate';

/**
 * Descarga lo que necesita el idioma en uso antes de arrancar la app: su
 * catalogo (el espanol ya va en el paquete inicial; los demas son trozos
 * aparte que solo se bajan si se usan) y los datos de locale de Angular
 * (nombres de meses y dias para DatePipe). Se llama desde main.ts ANTES de
 * importar el resto de la app, asi todo lo que se evalua al cargar los modulos
 * (constantes con t()) ya encuentra el idioma listo.
 */
const CATALOG_LOADERS: Record<Exclude<Lang, 'es'>, () => Promise<Catalog>> = {
  en: () => import('./en').then((module) => module.en),
  ca: () => import('./ca').then((module) => module.ca),
  fr: () => import('./fr').then((module) => module.fr),
  it: () => import('./it').then((module) => module.it),
  de: () => import('./de').then((module) => module.de),
};

const LOCALE_DATA_LOADERS: Record<Lang, () => Promise<{ default: unknown }>> = {
  es: () => import('@angular/common/locales/es'),
  en: () => import('@angular/common/locales/en-GB'),
  ca: () => import('@angular/common/locales/ca'),
  fr: () => import('@angular/common/locales/fr'),
  it: () => import('@angular/common/locales/it'),
  de: () => import('@angular/common/locales/de'),
};

export async function loadActiveLanguage(lang: Lang = currentLang()): Promise<void> {
  const [catalog, localeData] = await Promise.all([
    lang === 'es' ? Promise.resolve(null) : CATALOG_LOADERS[lang](),
    LOCALE_DATA_LOADERS[lang](),
  ]);
  if (catalog) registerCatalog(lang, catalog);
  registerLocaleData(localeData.default, currentLocale());
}
