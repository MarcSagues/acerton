import { Injectable } from '@angular/core';
import { Lang, SUPPORTED_LANGS, currentLang, storeLanguage } from './translate';

export interface LanguageOption {
  code: Lang;
  /** Cada idioma se nombra en si mismo, para poder encontrarlo aunque la app este en otro. */
  name: string;
}

@Injectable({ providedIn: 'root' })
export class I18nService {
  readonly languages: readonly LanguageOption[] = [
    { code: 'es', name: 'Español' },
    { code: 'en', name: 'English' },
  ].filter((option): option is LanguageOption => (SUPPORTED_LANGS as readonly string[]).includes(option.code));

  get lang(): Lang {
    return currentLang();
  }

  /** Guarda el idioma y recarga: todo el texto (constantes, canvas, formatos de fecha) se vuelve a evaluar con el nuevo idioma. */
  setLanguage(lang: Lang): void {
    if (lang === currentLang()) return;
    storeLanguage(lang);
    location.reload();
  }
}
