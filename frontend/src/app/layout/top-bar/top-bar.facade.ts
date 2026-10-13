import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';

/** Pantallas que llevan el selector de grupo en la barra (Jornada y Tabla; no sus subpantallas, como los resultados). */
const ROUTES_WITH_GROUP_SWITCHER = ['/matchday', '/rankings'];

export function routeHasGroupSwitcher(path: string): boolean {
  return ROUTES_WITH_GROUP_SWITCHER.includes(path);
}

@Injectable()
export class TopBarFacade {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly notificationsFeed = inject(NotificationsFeedService);

  readonly currentUser = this.authService.currentUser;
  readonly unreadCount = this.notificationsFeed.unreadCount;
  /** Punto de "subiste de nivel" sin ver: antes iba en la pestaña Perfil de la barra inferior, que ahora es Quiz. */
  readonly hasUnreadLevelUp = computed(() => this.notificationsFeed.unreadLevelUps().length > 0);

  private readonly currentPath = signal(this.router.url.split('?')[0]);
  /** Con selector de grupo la barra lo lleva dentro (fijo con ella); sin el, deja mas margen inferior para que el contenido no quede pegado. */
  readonly hasGroupSwitcher = computed(() => routeHasGroupSwitcher(this.currentPath()));

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.currentPath.set(event.urlAfterRedirects.split('?')[0]));

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
