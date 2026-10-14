import { Component, inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { ProfileLanguageFacade } from './profile-language.facade';

/** Pestaña «Idioma» de Ajustes (antes iba junto a la apariencia). */
@Component({
  selector: 'app-profile-language',
  standalone: true,
  imports: [TranslatePipe],
  providers: [ProfileLanguageFacade],
  templateUrl: './profile-language.component.html',
  styleUrl: './profile-language.component.scss',
})
export class ProfileLanguageComponent {
  readonly page = inject(ProfileLanguageFacade);
}
