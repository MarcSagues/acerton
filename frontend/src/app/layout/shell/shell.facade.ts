import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AdsService } from '../../core/services/ads.service';
import { BottomNavService } from '../../core/services/bottom-nav.service';

/**
 * Pantallas de conseguir el primer grupo (ver hasGroupGuard/app.routes): son
 * flujos autocontenidos con su propia cabecera y boton de volver, no tabs
 * reales de la app — la barra inferior no pinta nada ahi, sobre todo para
 * quien todavia no tiene ningun grupo (Jornada/Tabla/Perfil no funcionan sin
 * uno y solo confunden).
 */
const ROUTES_WITHOUT_BOTTOM_NAV = ['/groups/create', '/groups/join-code', '/groups/public'];

@Injectable()
export class ShellFacade {
  private readonly ads = inject(AdsService);
  private readonly router = inject(Router);
  private readonly bottomNav = inject(BottomNavService);

  private readonly currentPath = signal(this.router.url.split('?')[0]);

  /** Por ruta (rutas del primer grupo, ver ROUTES_WITHOUT_BOTTOM_NAV) o porque
      la propia pantalla lo pide (ver BottomNavService — p.ej. "Ver resumen" en
      Jornada, un estado dentro de la misma ruta, no una navegacion). */
  readonly hideBottomNav = computed(
    () => ROUTES_WITHOUT_BOTTOM_NAV.some((path) => this.currentPath().startsWith(path)) || this.bottomNav.forceHidden(),
  );

  init(): void {
    this.ads.showBanner();
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentPath.set(event.urlAfterRedirects.split('?')[0]);
    });
  }
}
