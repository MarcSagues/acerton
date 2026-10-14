import { Injectable, inject } from '@angular/core';
import { Lang, currentLang } from '../../../core/i18n/translate';
import { I18nService } from '../../../core/i18n/i18n.service';

@Injectable()
export class ProfileLanguageFacade {
  private readonly i18n = inject(I18nService);

  readonly languages = this.i18n.languages;
  readonly lang: Lang = currentLang();

  setLanguage(lang: Lang): void {
    this.i18n.setLanguage(lang);
  }
}
