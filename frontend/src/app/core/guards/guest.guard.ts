import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Para rutas pensadas solo para quien no ha iniciado sesion (la landing de
 * bienvenida). Sin esto, un usuario ya logueado veia un instante la landing
 * (el componente llega a montarse y pintarse) antes de que su propio
 * ngOnInit detectara la sesion y redirigiera a /matchday — el guard corta
 * ese paso: decide antes de montar el componente, asi que nunca llega a
 * pintarse.
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/matchday']);
};
