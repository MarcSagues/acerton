import { APP_INITIALIZER, ApplicationConfig, inject, isDevMode, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideServiceWorker } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth.service';
import { EdgeSwipeBackService } from './core/services/edge-swipe-back.service';

/**
 * Remata la animacion del loader estatico (ver index.html) antes de dejar
 * que Angular sustituya su contenido: sin esto, el salto de "barra a mitad"
 * a la app real se veria brusco. Es deliberadamente sincrono con esta
 * promesa (no un timer suelto) para que solo se note en el primer arranque,
 * nunca en una navegacion posterior.
 */
function finishBootLoader(): Promise<void> {
  const loader = document.getElementById('boot-loader');
  if (!loader) return Promise.resolve();
  loader.classList.add('boot-done');
  return new Promise((resolve) => setTimeout(resolve, 500));
}

function initializeAuth(authService: AuthService): () => Promise<boolean> {
  return () => firstValueFrom(authService.bootstrap()).then(async (result) => {
    await finishBootLoader();
    return result;
  });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      // Solo anima la navegacion que viene del gesto de deslizar desde el
      // borde (ver EdgeSwipeBackService): el resto de navegaciones (enlaces,
      // botones "volver", pestañas) no cambian de comportamiento. Sin
      // soporte de la View Transitions API (WebViews antiguas) esto no hace
      // nada — la navegacion sigue funcionando igual, solo sin animacion.
      withViewTransitions({
        onViewTransitionCreated: ({ transition }) => {
          const swipeBack = inject(EdgeSwipeBackService);
          if (!swipeBack.consumePendingSwipeAnimation()) {
            transition.skipTransition();
            return;
          }
          const root = document.documentElement;
          root.classList.add('swipe-back-transition');
          transition.finished.finally(() => root.classList.remove('swipe-back-transition'));
        },
      }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimationsAsync(),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
