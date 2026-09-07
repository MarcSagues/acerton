import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { GroupsService } from '../services/groups.service';
import { ActiveGroupService } from '../services/active-group.service';

/**
 * Sin ningun grupo no hay nada que hacer en la app (jornada, tabla y perfil
 * dependen de tener al menos uno) — se manda a /welcome a crear o unirse a
 * uno antes de dejar pasar al shell con la barra de navegacion.
 */
export const hasGroupGuard: CanActivateFn = () => {
  const groupsService = inject(GroupsService);
  const activeGroupService = inject(ActiveGroupService);
  const router = inject(Router);

  return groupsService.loadMyGroups().pipe(
    map((groups) => {
      activeGroupService.setGroups(groups);
      return groups.length > 0 ? true : router.createUrlTree(['/welcome']);
    }),
  );
};
