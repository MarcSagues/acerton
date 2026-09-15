import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';

@Injectable()
export class TopBarFacade {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsFeed = inject(NotificationsFeedService);

  readonly currentUser = this.authService.currentUser;
  readonly unreadCount = this.notificationsFeed.unreadCount;

  constructor() {
    // El top-bar esta presente en todo el shell autenticado: es el punto de
    // entrada natural para tener el contador de sin-leer listo sin esperar
    // a que el usuario abra la pantalla de avisos.
    this.notificationsFeed.ensureLoaded();
  }

  goNotifications(): void {
    this.router.navigate(['/notifications']);
  }

  goProfile(): void {
    this.router.navigate(['/profile']);
  }
}
