import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { UsernameOnboardingFacade } from './username-onboarding.facade';

@Component({
  selector: 'app-username-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [UsernameOnboardingFacade],
  templateUrl: './username-onboarding.component.html',
  styleUrl: './username-onboarding.component.scss',
})
export class UsernameOnboardingComponent {
  readonly page = inject(UsernameOnboardingFacade);
}
