import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { finalize, map } from 'rxjs';
import { GroupsService } from '../services/groups.service';
import { ActiveGroupService } from '../services/active-group.service';
import { AuthService } from '../services/auth.service';

/**
 * Evita lanzar una segunda recarga de grupos mientras otra sigue en vuelo:
 * al saltar rapido entre pestañas se acumularian peticiones a un endpoint
 * que no es barato (calcula tu posicion y los pendientes de cada grupo).
 */
let backgroundRefreshInFlight = false;

/**
 * Sin ningun grupo, jornada/tabla/perfil no funcionan (dependen de tener uno
 * activo). Distingue dos casos:
 * - Nunca ha estado en ningun grupo (no ha pasado el tutorial ni una vez):
 *   se manda a /welcome, fuera del shell y sin barra de navegacion, porque
 *   nada mas en la app tiene sentido todavia.
 * - Ya estuvo en algun grupo y se ha salido de todos: se le deja dentro del
 *   shell (barra de navegacion intacta) en /groups, que ya sabe mostrar el
 *   estado vacio con crear/unirse — no tiene sentido volver a tratarlo como
 *   si nunca hubiera usado la app.
 *
 * El listado de grupos se vuelve a pedir en CADA navegacion (alimenta los
 * puntos rojos de pendientes), pero solo se espera a la respuesta la primera
 * vez o cuando no hay un grupo activo resuelto: ese endpoint tarda cerca de
 * un segundo y esperarlo en cada cambio de pestaña hacia que la vista
 * tardara en cambiar. Con el grupo activo ya en memoria se entra al
 * instante y la lista se refresca por detras (misma logica, sin bloquear).
 */
export const hasGroupGuard: CanActivateFn = () => {
  const groupsService = inject(GroupsService);
  const activeGroupService = inject(ActiveGroupService);
  const authService = inject(AuthService);
  const router = inject(Router);

  const noGroupsUrl = () => {
    const alreadyOnboarded = authService.currentUser()?.tutorialCompleted ?? false;
    return router.createUrlTree([alreadyOnboarded ? '/groups' : '/welcome']);
  };

  // activeGroup() (y no solo "hay algun grupo en la lista") porque tras
  // crear/unirse a un grupo se llama a setActive(id) con una lista que
  // todavia no lo contiene: ahi si hay que esperar a la lista real para que
  // el grupo activo (modo de puntuacion, nombre...) este resuelto al pintar.
  if (activeGroupService.activeGroup() !== null) {
    if (!backgroundRefreshInFlight) {
      backgroundRefreshInFlight = true;
      groupsService
        .loadMyGroups()
        .pipe(finalize(() => (backgroundRefreshInFlight = false)))
        .subscribe({
          next: (groups) => {
            activeGroupService.setGroups(groups);
            // Te han sacado/has salido de todos los grupos desde otro sitio
            // mientras entrabas por el atajo rapido: mismo destino que si el
            // guard hubiera esperado a la respuesta.
            if (groups.length === 0) void router.navigateByUrl(noGroupsUrl());
          },
          // Sin red o 5xx: seguimos con los datos que ya tenemos, igual que
          // haria cualquier otra pantalla ya abierta. Los 401 ya los gestiona
          // el interceptor.
          error: () => undefined,
        });
    }
    return true;
  }

  return groupsService.loadMyGroups().pipe(
    map((groups) => {
      activeGroupService.setGroups(groups);
      return groups.length > 0 ? true : noGroupsUrl();
    }),
  );
};
