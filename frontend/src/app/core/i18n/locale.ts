import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import localeEnGb from '@angular/common/locales/en-GB';

/** Datos de locale para DatePipe (nombres de meses y dias) en los dos idiomas. */
export function registerAppLocales(): void {
  registerLocaleData(localeEs, 'es-ES');
  registerLocaleData(localeEnGb, 'en-GB');
}
