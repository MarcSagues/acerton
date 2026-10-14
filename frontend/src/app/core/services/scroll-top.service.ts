import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

/**
 * Cada pantalla se abre desde arriba, sin heredar el scroll de la anterior (tambien al volver atras).
 *
 * El scroll de la app no es el de la ventana sino el de `body` (html y body miden height:100% con
 * overflow-x:hidden, asi que body pasa a ser el contenedor con scroll): por eso
 * `withInMemoryScrolling` del router, que solo mueve la ventana, no hacia nada. Solo cuenta un cambio
 * de ruta; cambiar solo los parametros de la URL (query o fragmento) no sube.
 */
@Injectable({ providedIn: 'root' })
export class ScrollTopService {
  private readonly router = inject(Router);
  private lastPath: string | null = null;

  init(): void {
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      const path = event.urlAfterRedirects.split(/[?#]/)[0];
      if (path === this.lastPath) return;
      this.lastPath = path;
      this.scrollToTop();
    });
  }

  private scrollToTop(): void {
    const options: ScrollToOptions = { top: 0, left: 0, behavior: 'instant' };
    window.scrollTo(options);
    document.documentElement.scrollTo(options);
    document.body.scrollTo(options);
  }
}
