import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Las cuentas de Google entran con el nombre del perfil de Google sin que el
 * usuario lo haya elegido — se les manda a confirmarlo/cambiarlo antes de
 * dejarlas pasar al shell con la barra de navegacion (igual que hasGroupGuard
 * hace con "sin grupo todavia").
 */
export const usernameGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.currentUser()?.usernameConfirmed !== false) {
    return true;
  }

  return router.createUrlTree(['/onboarding/username']);
};
