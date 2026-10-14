import { Injectable, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { GroupsService } from '../../../core/services/groups.service';
import { GOOGLE_RETURN_URL_KEY } from '../auth-page/auth-page.constants';
import { t } from '../../../core/i18n/translate';

@Injectable()
export class AuthCallbackFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);

  readonly errorMessage = signal<string | null>(null);

  init(): void {
    const accessToken = this.route.snapshot.queryParamMap.get('accessToken');
    if (!accessToken) {
      this.errorMessage.set(t('authCallback.faltaTokenAccesoRespuesta'));
      return;
    }

    this.authService.completeGoogleLogin(accessToken).subscribe({
      next: () => {
        let returnUrl: string | null = null;
        try {
          returnUrl = sessionStorage.getItem(GOOGLE_RETURN_URL_KEY);
          sessionStorage.removeItem(GOOGLE_RETURN_URL_KEY);
        } catch {
          /* sessionStorage no disponible: cae al destino generico */
        }
        if (returnUrl) {
          this.router.navigateByUrl(returnUrl);
          return;
        }
        this.groupsService.postLoginRoute().subscribe((route) => this.router.navigate(route));
      },
      error: () => this.errorMessage.set(t('authCallback.pudoCompletarInicioSesion')),
    });
  }
}
