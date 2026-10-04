import { CUSTOM_ELEMENTS_SCHEMA, Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SpinnerComponent } from '../../../shared/ui/spinner/spinner.component';
import { UsernameOnboardingFacade } from './username-onboarding.facade';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-username-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, SpinnerComponent, TranslatePipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  providers: [UsernameOnboardingFacade],
  templateUrl: './username-onboarding.component.html',
  styleUrl: './username-onboarding.component.scss',
})
export class UsernameOnboardingComponent {
  readonly page = inject(UsernameOnboardingFacade);
}
