import { Component } from '@angular/core';

/**
 * Nunca llega a pintarse de verdad: referralLinkGuard siempre redirige antes
 * de activar esta ruta (a /register o a /matchday). Existe solo porque el
 * router exige un componente en la definicion de la ruta.
 */
@Component({
  selector: 'app-referral-redirect',
  standalone: true,
  template: '',
})
export class ReferralRedirectComponent {}
