import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';

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

  readonly theme = this.themeService.preference;

  readonly options: ThemeOption[] = [
    { value: 'auto', name: 'Sistema', desc: 'Seguir el ajuste del dispositivo', icon: 'sistema' },
    { value: 'light', name: 'Claro', desc: 'Marfil, superficies blancas y bronce', icon: 'sol' },
    { value: 'dark', name: 'Oscuro', desc: 'Grafito y acentos champán', icon: 'luna' },
  ];

  setTheme(pref: ThemePreference): void {
    this.themeService.setPreference(pref);
  }

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
