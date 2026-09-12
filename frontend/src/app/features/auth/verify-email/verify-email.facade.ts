import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GroupsService } from '../../../core/services/groups.service';

@Injectable()
export class VerifyEmailFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);

  readonly errorMessage = signal<string | null>(null);

  init(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.errorMessage.set('Falta el token de confirmacion en el enlace.');
      return;
    }

    this.authService.verifyEmail(token).subscribe({
      next: () => this.groupsService.postLoginRoute().subscribe((route) => this.router.navigate(route)),
      error: (error) =>
        this.errorMessage.set(
          error.error?.message ?? 'El enlace de confirmacion no es valido o ha caducado.',
        ),
    });
  }
}
