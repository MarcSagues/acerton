import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { GroupsService } from '../services/groups.service';
import { ActiveGroupService } from '../services/active-group.service';
import { AuthService } from '../services/auth.service';

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
 */
export const hasGroupGuard: CanActivateFn = () => {
  const groupsService = inject(GroupsService);
  const activeGroupService = inject(ActiveGroupService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return groupsService.loadMyGroups().pipe(
    map((groups) => {
      activeGroupService.setGroups(groups);
      if (groups.length > 0) return true;
      const alreadyOnboarded = authService.currentUser()?.tutorialCompleted ?? false;
      return router.createUrlTree([alreadyOnboarded ? '/groups' : '/welcome']);
    }),
  );
};
