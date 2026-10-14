import { CUSTOM_ELEMENTS_SCHEMA, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslationKey } from '../../../core/i18n/translate';

interface SettingsTab {
  path: string;
  label: TranslationKey;
}

/** Ajustes: una página con una pestaña por cada cosa que se puede cambiar (cada una es una ruta hija). */
@Component({
  selector: 'app-profile-settings',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-settings.component.html',
  styleUrl: './profile-settings.component.scss',
})
export class ProfileSettingsComponent {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  /** La contraseña solo la tienen las cuentas con correo (las de Google/Apple no). */
  readonly tabs = computed<SettingsTab[]>(() => {
    const tabs: SettingsTab[] = [
      { path: 'name', label: 'profilePage.nombre' },
      { path: 'favorite-team', label: 'profileSettings.equipo' },
      { path: 'notifications', label: 'common.avisos' },
      { path: 'appearance', label: 'common.apariencia' },
      { path: 'language', label: 'profileAppearance.idioma' },
    ];
    if (this.authService.currentUser()?.hasPassword) {
      tabs.push({ path: 'password', label: 'common.contrasena' });
    }
    return tabs;
  });

  goBack(): void {
    this.router.navigate(['/profile']);
  }
}
