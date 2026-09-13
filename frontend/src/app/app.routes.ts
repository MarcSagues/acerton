import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
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
    path: 'error-demo',
    loadComponent: () =>
      import('./features/error/error-page/error-page.component').then((m) => m.ErrorPageComponent),
  },
  {
    path: 'auth/callback',
    loadComponent: () =>
      import('./features/auth/auth-callback/auth-callback.component').then(
        (m) => m.AuthCallbackComponent,
      ),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email.component').then((m) => m.VerifyEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
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
    // (guestGuard, antes de montar nada — sin el, se veia un instante la
    // landing antes de que LandingPageFacade.init() detectara la sesion y
    // redirigiera). Si no, es lo que ve cualquiera (incluidos rastreadores
    // como el de Google) sin necesidad de acceder.
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/landing/landing-page/landing-page.component').then(
        (m) => m.LandingPageComponent,
      ),
  },
  {
    path: '',
    canActivate: [authGuard, usernameGuard],
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        // Sin guardia de grupo a proposito: son las 3 vias para conseguir el
        // primer grupo, las que ofrecen los botones de /welcome (ver
        // GroupListFacade.goToCreate/goToJoinCode/goToExplorePublic) — si
        // llevaran hasGroupGuard, un usuario sin grupos rebotaria de vuelta a
        // /welcome nada mas pulsarlos, como si el boton no hiciera nada.
        path: 'groups/create',
        loadComponent: () =>
          import('./features/groups/group-create/group-create.component').then(
            (m) => m.GroupCreateComponent,
          ),
      },
      {
        path: 'groups/join-code',
        loadComponent: () =>
          import('./features/groups/group-join-code/group-join-code.component').then(
            (m) => m.GroupJoinCodeComponent,
          ),
      },
      {
        path: 'groups/public',
        loadComponent: () =>
          import('./features/groups/group-explore/group-explore.component').then(
            (m) => m.GroupExploreComponent,
          ),
      },
      {
        // Sin hasGroupGuard a proposito: es la pantalla a la que el propio
        // guard redirige cuando ya no quedan grupos (ver hasGroupGuard) y
        // sabe mostrar su propio estado vacio con crear/unirse — ponerle el
        // guard aqui crearia un bucle de redireccion sobre si misma.
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/group-list/group-list.component').then(
            (m) => m.GroupListComponent,
          ),
      },
      {
        path: 'groups/:groupId/settings',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/groups/group-detail/group-detail.component').then(
            (m) => m.GroupDetailComponent,
          ),
      },
      {
        path: 'groups/:groupId/members/:userId',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/groups/member-detail/member-detail.component').then(
            (m) => m.MemberDetailComponent,
          ),
      },
      {
        path: 'groups/:groupId/members/:userId/stats',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-stats/profile-stats.component').then(
            (m) => m.ProfileStatsComponent,
          ),
      },
      {
        path: 'groups/:groupId/members/:userId/history',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-history/profile-history.component').then(
            (m) => m.ProfileHistoryComponent,
          ),
      },
      {
        path: 'groups/:groupId/invite',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/groups/group-invite/group-invite.component').then(
            (m) => m.GroupInviteComponent,
          ),
      },
      {
        path: 'matchday',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/matchday/current-matchday/current-matchday.component').then(
            (m) => m.CurrentMatchdayComponent,
          ),
      },
      {
        path: 'matchday/calendar',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/matchday/matchday-calendar/matchday-calendar.component').then(
            (m) => m.MatchdayCalendarComponent,
          ),
      },
      {
        path: 'matchday/history',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/matchday/matchday-history/matchday-history.component').then(
            (m) => m.MatchdayHistoryComponent,
          ),
      },
      {
        path: 'matchday/:matchdayId/results',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/matchday/matchday-results/matchday-results.component').then(
            (m) => m.MatchdayResultsComponent,
          ),
      },
      {
        path: 'matchday/:matchdayId/results/:userId',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/matchday/matchday-results/matchday-results.component').then(
            (m) => m.MatchdayResultsComponent,
          ),
      },
      {
        path: 'rankings',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/rankings/rankings-page/rankings-page.component').then(
            (m) => m.RankingsPageComponent,
          ),
      },
      {
        path: 'profile',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
      },
      {
        path: 'profile/avatar',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-avatar/profile-avatar.component').then(
            (m) => m.ProfileAvatarComponent,
          ),
      },
      {
        path: 'profile/appearance',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-appearance/profile-appearance.component').then(
            (m) => m.ProfileAppearanceComponent,
          ),
      },
      {
        path: 'profile/change-password',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-change-password/profile-change-password.component').then(
            (m) => m.ProfileChangePasswordComponent,
          ),
      },
      {
        path: 'profile/badges',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-badges/profile-badges.component').then(
            (m) => m.ProfileBadgesComponent,
          ),
      },
      {
        path: 'profile/stats',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-stats/profile-stats.component').then(
            (m) => m.ProfileStatsComponent,
          ),
      },
      {
        path: 'profile/history',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/profile-history/profile-history.component').then(
            (m) => m.ProfileHistoryComponent,
          ),
      },
      {
        path: 'profile/trophies/:trophyId/:year',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/profile/trophy-season/trophy-season.component').then(
            (m) => m.TrophySeasonComponent,
          ),
      },
      {
        path: 'notifications',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/notifications/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
          ),
      },
      {
        path: 'notifications/preferences',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/notifications/notification-settings/notification-settings.component').then(
            (m) => m.NotificationSettingsComponent,
          ),
      },
      {
        path: 'rules',
        canActivate: [hasGroupGuard],
        loadComponent: () =>
          import('./features/rules/rules-and-prizes/rules-and-prizes.component').then(
            (m) => m.RulesAndPrizesComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'matchday' },
];
