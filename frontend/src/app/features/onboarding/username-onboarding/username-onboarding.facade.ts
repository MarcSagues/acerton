import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GroupsService } from '../../../core/services/groups.service';
import { ProfileService } from '../../../core/services/profile.service';
import { usernameHint, usernameValidator } from '../../../shared/username.util';

@Injectable()
export class UsernameOnboardingFacade {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly groupsService = inject(GroupsService);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly form = this.fb.nonNullable.group({
    name: [this.authService.currentUser()?.name ?? '', [Validators.required, usernameValidator()]],
  });

  nameHint(): string | null {
    const control = this.form.controls.name;
    if (!control.value) return null;
    return usernameHint(control.errors);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    this.profileService.updateName(this.form.getRawValue().name.trim()).subscribe({
      next: (user) => {
        this.loading.set(false);
        this.authService.setCurrentUser(user);
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }
        this.groupsService.postLoginRoute().subscribe((route) => this.router.navigate(route));
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(error.error?.message ?? 'No se pudo guardar el nombre');
      },
    });
  }
}
