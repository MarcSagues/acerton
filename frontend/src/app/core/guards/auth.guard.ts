import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }

  // Guarda a donde ibas (ej. un enlace de invitacion a un grupo, o el
  // resultado de una jornada compartido) para volver ahi mismo tras el
  // login, en vez de mandarte siempre al destino generico.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
