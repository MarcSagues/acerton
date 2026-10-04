import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';
import { Lang, currentLang, t } from '../../../core/i18n/translate';
import { I18nService } from '../../../core/i18n/i18n.service';

export interface ThemeOption {
  value: ThemePreference;
  name: string;
  desc: string;
  icon: string;
}

@Injectable()
export class ProfileAppearanceFacade {
  private readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  readonly theme = this.themeService.preference;

  readonly options: ThemeOption[] = [
    { value: 'auto', name: t('profileAppearance.sistema'), desc: t('profileAppearance.seguirAjusteDispositivo'), icon: 'sistema' },
    { value: 'light', name: t('profileAppearance.claro'), desc: t('profileAppearance.marfilSuperficiesBlancasBronce'), icon: 'sol' },
    { value: 'dark', name: t('profileAppearance.oscuro'), desc: t('profileAppearance.grafitoAcentosChampan'), icon: 'luna' },
  ];

  readonly languages = this.i18n.languages;
  readonly lang: Lang = currentLang();

  setLanguage(lang: Lang): void {
    this.i18n.setLanguage(lang);
  }

  setTheme(pref: ThemePreference): void {
    this.themeService.setPreference(pref);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
