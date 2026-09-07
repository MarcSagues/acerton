import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { hasGroupGuard } from './core/guards/has-group.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
    data: { mode: 'login' },
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/auth-page/auth-page.component').then((m) => m.AuthPageComponent),
    data: { mode: 'register' },
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'groups/join/:inviteCode',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/group-join/group-join.component').then((m) => m.GroupJoinComponent),
  },
  {
    // Fuera del shell (sin bottom nav) a proposito: sin ningun grupo no hay
    // nada que hacer en el resto de la app, asi que esta pantalla se planta
    // por delante hasta que se crea uno o se une a uno.
    path: 'welcome',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/groups/group-list/group-list.component').then((m) => m.GroupListComponent),
  },
  {
    path: '',
    canActivate: [authGuard, hasGroupGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'matchday', pathMatch: 'full' },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/group-list/group-list.component').then(
            (m) => m.GroupListComponent,
          ),
      },
      {
        path: 'groups/:groupId/settings',
        loadComponent: () =>
          import('./features/groups/group-detail/group-detail.component').then(
            (m) => m.GroupDetailComponent,
          ),
      },
      {
        path: 'matchday',
        loadComponent: () =>
          import('./features/matchday/current-matchday/current-matchday.component').then(
            (m) => m.CurrentMatchdayComponent,
          ),
      },
      {
        path: 'matchday/:matchdayId/results',
        loadComponent: () =>
          import('./features/matchday/matchday-results/matchday-results.component').then(
            (m) => m.MatchdayResultsComponent,
          ),
      },
      {
        path: 'rankings',
        loadComponent: () =>
          import('./features/rankings/rankings-page/rankings-page.component').then(
            (m) => m.RankingsPageComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'matchday' },
];
