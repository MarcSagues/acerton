import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileChangePasswordFacade } from './profile-change-password.facade';

@Component({
  selector: 'app-profile-change-password',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent],
  providers: [ProfileChangePasswordFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-change-password.component.html',
  styleUrl: './profile-change-password.component.scss',
})
export class ProfileChangePasswordComponent {
  readonly page = inject(ProfileChangePasswordFacade);
}
