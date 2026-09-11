import { Component, inject } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { UsernameOnboardingFacade } from './username-onboarding.facade';

@Component({
  selector: 'app-username-onboarding',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule],
  providers: [UsernameOnboardingFacade],
  templateUrl: './username-onboarding.component.html',
  styleUrl: './username-onboarding.component.scss',
})
export class UsernameOnboardingComponent {
  readonly page = inject(UsernameOnboardingFacade);
}
