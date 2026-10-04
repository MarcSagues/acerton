import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ProfileAppearanceFacade } from './profile-appearance.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-profile-appearance',
  standalone: true,
  imports: [TranslatePipe],
  providers: [ProfileAppearanceFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-appearance.component.html',
  styleUrl: './profile-appearance.component.scss',
})
export class ProfileAppearanceComponent {
  readonly page = inject(ProfileAppearanceFacade);
}
