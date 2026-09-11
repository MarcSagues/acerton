import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { initials } from '../../shared/utils/initials';

@Injectable()
export class TopBarFacade {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly currentUser = this.authService.currentUser;

  initials(name: string): string {
    return initials(name);
  }

  goNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goProfile(): void {
    this.router.navigate(['/profile']);
  }
}
