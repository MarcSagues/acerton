import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ONBOARDING_STEPS } from '../domain/onboarding-step';

@Injectable()
export class LandingPageFacade {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly steps = ONBOARDING_STEPS;
  readonly currentStep = signal(0);

  init(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/matchday');
    }
  }

  next(): void {
    this.currentStep.update((step) => Math.min(step + 1, this.steps.length - 1));
  }

  goTo(step: number): void {
    this.currentStep.set(step);
  }
}
