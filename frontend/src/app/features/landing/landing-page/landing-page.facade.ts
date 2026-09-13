import { Injectable, signal } from '@angular/core';
import { ONBOARDING_STEPS } from '../domain/onboarding-step';

@Injectable()
export class LandingPageFacade {
  readonly steps = ONBOARDING_STEPS;
  readonly currentStep = signal(0);

  next(): void {
    this.currentStep.update((step) => Math.min(step + 1, this.steps.length - 1));
  }

  goTo(step: number): void {
    this.currentStep.set(step);
  }
}
