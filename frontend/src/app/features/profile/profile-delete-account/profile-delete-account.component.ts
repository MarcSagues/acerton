import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { ProfileDeleteAccountFacade } from './profile-delete-account.facade';

@Component({
  selector: 'app-profile-delete-account',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent],
  providers: [ProfileDeleteAccountFacade],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './profile-delete-account.component.html',
  styleUrl: './profile-delete-account.component.scss',
})
export class ProfileDeleteAccountComponent {
  readonly page = inject(ProfileDeleteAccountFacade);
}
