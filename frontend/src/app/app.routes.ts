import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { hasGroupGuard } from './core/guards/has-group.guard';
import { usernameGuard } from './core/guards/username-guard';

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
    path: 'privacy',
    loadComponent: () =>
      import('./features/legal/privacy-policy/privacy-policy.component').then(
        (m) => m.PrivacyPolicyComponent,
      ),
  },
  {
    path: 'soporte',
    loadComponent: () =>
      import('./features/legal/soporte/soporte.component').then((m) => m.SoporteComponent),
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
    // Cuentas de Google recien creadas: el nombre viene del perfil de Google
    // sin que el usuario lo haya elegido, se le pide confirmarlo antes de
    // dejarlo pasar (ver usernameGuard).
    path: 'onboarding/username',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/onboarding/username-onboarding/username-onboarding.component').then(
        (m) => m.UsernameOnboardingComponent,
      ),
  },
  {
    // Home publica: si ya has iniciado sesion te manda dentro de la app
    // (ver LandingPageComponent), si no, es lo que ve cualquiera (incluidos
    // rastreadores como el de Google) sin necesidad de acceder.
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/landing/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard, usernameGuard, hasGroupGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
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
        path: 'groups/:groupId/members/:userId',
        loadComponent: () =>
          import('./features/groups/member-detail/member-detail.component').then(
            (m) => m.MemberDetailComponent,
          ),
      },
      {
        path: 'groups/:groupId/invite',
        loadComponent: () =>
          import('./features/groups/group-invite/group-invite.component').then(
            (m) => m.GroupInviteComponent,
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
        path: 'matchday/calendar',
        loadComponent: () =>
          import('./features/matchday/matchday-calendar/matchday-calendar.component').then(
            (m) => m.MatchdayCalendarComponent,
          ),
      },
      {
        path: 'matchday/history',
        loadComponent: () =>
          import('./features/matchday/matchday-history/matchday-history.component').then(
            (m) => m.MatchdayHistoryComponent,
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
        path: 'matchday/:matchdayId/results/:userId',
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
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'matchday' },
];
