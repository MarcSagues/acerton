import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ProfileAppearanceFacade } from './profile-appearance.facade';

@Component({
  selector: 'app-profile-appearance',
  standalone: true,
  providers: [ProfileAppearanceFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-appearance.component.html',
  styleUrl: './profile-appearance.component.scss',
})
export class ProfileAppearanceComponent {
  readonly page = inject(ProfileAppearanceFacade);
}
