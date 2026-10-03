import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AdsService } from '../../core/services/ads.service';
import { AuthService } from '../../core/services/auth.service';
import { BottomNavService } from '../../core/services/bottom-nav.service';
import { PushNotificationsService } from '../../core/services/push-notifications.service';
import { NotificationsFeedService } from '../../core/services/notifications-feed.service';
import { PiqoDialogService } from '../../shared/ui/dialog/dialog.service';
import { LevelUpDialogComponent } from '../../features/profile/level-up-dialog/level-up-dialog.component';

/**
 * Pantallas de conseguir el primer grupo (ver hasGroupGuard/app.routes): son
 * flujos autocontenidos con su propia cabecera y boton de volver, no tabs
 * reales de la app — la barra inferior no pinta nada ahi, sobre todo para
 * quien todavia no tiene ningun grupo (Jornada/Tabla/Perfil no funcionan sin
 * uno y solo confunden).
 */
const ROUTES_WITHOUT_BOTTOM_NAV = ['/groups/create', '/groups/join-code', '/groups/public'];

/**
 * Cada cuanto se vuelve a pedir el feed de avisos mientras la app sigue
 * abierta, solo para poder detectar en vivo una subida de nivel ocurrida
 * mientras se esta usando (ver NotificationsFeedService.
 * pendingLevelUpPopup) — el resto de la app no necesita esto, ya que
 * ensureLoaded() basta para la campanita/pantalla de Avisos normales.
 */
const LEVEL_UP_POLL_INTERVAL_MS = 2 * 60 * 1000;

@Injectable()
export class ShellFacade {
  private readonly ads = inject(AdsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly bottomNav = inject(BottomNavService);
  private readonly pushNotifications = inject(PushNotificationsService);
  private readonly notificationsFeed = inject(NotificationsFeedService);
  private readonly dialog = inject(PiqoDialogService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly currentPath = signal(this.router.url.split('?')[0]);

  constructor() {
    // Pop-up de "subiste de nivel" con la app abierta (ver
    // NotificationsFeedService.pendingLevelUpPopup): el shell se monta una
    // sola vez por sesion, sitio natural para escuchar esto sin importar
    // en que pantalla este el usuario cuando llega el aviso.
    effect(
      () => {
        const pending = this.notificationsFeed.pendingLevelUpPopup();
        if (pending?.level != null) {
          this.notificationsFeed.pendingLevelUpPopup.set(null);
          // AuthService.currentUser() (nivel del avatar, gating de
          // /profile/avatar) solo se actualiza en el arranque de la app o
          // tras una accion explicita — sin esto, la mascota/color recien
          // desbloqueado seguia apareciendo bloqueado hasta cerrar y
          // volver a abrir la app.
          this.authService.refreshCurrentUser().subscribe();
          this.dialog.open(LevelUpDialogComponent, { data: { level: pending.level } });
        }
      },
      { allowSignalWrites: true },
    );
  }

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

    // Con retraso corto para no competir visualmente con el aviso de
    // cookies/legal que tambien puede aparecer nada mas entrar — el dialogo
    // nativo del sistema no se solapa con la UI de la pagina, pero que
    // salgan los dos a la vez es mas confuso que darle un respiro a cada
    // uno. No hace nada si ya se pidio antes (ver promptOnFirstLaunch).
    setTimeout(() => void this.pushNotifications.promptOnFirstLaunch(), 1500);

    const pollId = setInterval(() => this.notificationsFeed.refresh(), LEVEL_UP_POLL_INTERVAL_MS);
    this.destroyRef.onDestroy(() => clearInterval(pollId));
  }
}
