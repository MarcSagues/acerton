import { Injectable, inject } from '@angular/core';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';
import { t } from '../../../core/i18n/translate';

export interface ThemeOption {
  value: ThemePreference;
  name: string;
  desc: string;
  icon: string;
}

@Injectable()
export class ProfileAppearanceFacade {
  private readonly themeService = inject(ThemeService);

  readonly theme = this.themeService.preference;

  readonly options: ThemeOption[] = [
    { value: 'auto', name: t('profileAppearance.sistema'), desc: t('profileAppearance.seguirAjusteDispositivo'), icon: 'sistema' },
    { value: 'light', name: t('profileAppearance.claro'), desc: t('profileAppearance.marfilSuperficiesBlancasBronce'), icon: 'sol' },
    { value: 'dark', name: t('profileAppearance.oscuro'), desc: t('profileAppearance.grafitoAcentosChampan'), icon: 'luna' },
  ];

  setTheme(pref: ThemePreference): void {
    this.themeService.setPreference(pref);
  }

}
