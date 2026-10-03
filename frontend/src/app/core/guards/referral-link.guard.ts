import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ReferralService } from '../services/referral.service';
import { ToastService } from '../../shared/ui/toast/toast.service';
import { PENDING_REFERRAL_CODE_KEY } from '../../features/auth/auth-page/auth-page.constants';

/**
 * Ruta `/r/:code` de un link de invitacion (Sprint 14, referidos). Si ya
 * hay sesion, intenta enlazar el codigo directamente (misma llamada que el
 * campo manual de Ajustes). Si no, guarda el codigo para usarlo al
 * registrarse (ver AuthPageFacade.submit/loginWithGoogleNative) y manda a
 * crear cuenta — mismo resultado final por los dos caminos (link o
 * codigo a mano), a peticion explicita del usuario (ver decisions.md
 * 2026-09-16).
 */
export const referralLinkGuard: CanActivateFn = async (route) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const referralService = inject(ReferralService);
  const toast = inject(ToastService);

  const code = route.paramMap.get('code')?.toUpperCase();
  if (!code) {
    return router.createUrlTree(['/']);
  }

  if (!authService.isAuthenticated()) {
    try {
      sessionStorage.setItem(PENDING_REFERRAL_CODE_KEY, code);
    } catch {
      /* sessionStorage no disponible: el link no aporta nada extra, pero el registro sigue funcionando */
    }
    return router.createUrlTree(['/register']);
  }

  try {
    await firstValueFrom(referralService.redeem(code));
    toast.show('¡Código de invitación aplicado!');
  } catch (error) {
    const message = error instanceof HttpErrorResponse ? (error.error?.message as string | undefined) : undefined;
    toast.show(message ?? 'No se pudo aplicar el código de invitación');
  }
  return router.createUrlTree(['/matchday']);
};
