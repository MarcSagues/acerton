import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { guestGuard } from './core/guards/guest.guard';
import { hasGroupGuard } from './core/guards/has-group.guard';
import { referralLinkGuard } from './core/guards/referral-link.guard';
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
    // Link de invitacion de referidos (Sprint 14) — sin authGuard a proposito,
    // lo tiene que poder abrir alguien sin cuenta todavia (ver referralLinkGuard).
    path: 'r/:code',
    canActivate: [referralLinkGuard],
    loadComponent: () =>
      import('./features/auth/referral-redirect/referral-redirect.component').then(
        (m) => m.ReferralRedirectComponent,
      ),
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
        // Quiz de jornada: evento para toda la comunidad, sin hasGroupGuard a
        // proposito (se puede jugar sin pertenecer a ningun grupo).
        path: 'quiz',
        loadComponent: () =>
          import('./features/quiz/quiz-hub/quiz-hub.component').then((m) => m.QuizHubComponent),
      },
      {
        path: 'quiz/history/:userId',
        loadComponent: () =>
          import('./features/quiz/quiz-history/quiz-history.component').then((m) => m.QuizHistoryComponent),
      },
      {
        path: 'quiz/:quizId',
        loadComponent: () =>
          import('./features/quiz/quiz-play/quiz-play.component').then((m) => m.QuizPlayComponent),
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
        // Perfil (y sus ajustes, insignias, nivel y avisos) son de la cuenta, no
        // de un grupo: sin hasGroupGuard para que quien juega solo al Quiz sin
        // grupo pueda entrar desde el avatar. Estadisticas, historico y normas
        // si dependen del grupo activo y conservan la guardia.
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-page/profile-page.component').then(
            (m) => m.ProfilePageComponent,
          ),
      },
      {
        path: 'profile/avatar',
        loadComponent: () =>
          import('./features/profile/profile-avatar/profile-avatar.component').then(
            (m) => m.ProfileAvatarComponent,
          ),
      },
      {
        // Ajustes: una pagina con una pestaña por cada ruta hija.
        path: 'profile/settings',
        loadComponent: () =>
          import('./features/profile/profile-settings/profile-settings.component').then(
            (m) => m.ProfileSettingsComponent,
          ),
        children: [
          { path: '', pathMatch: 'full', redirectTo: 'name' },
          {
            path: 'name',
            loadComponent: () =>
              import('./features/profile/profile-settings/profile-name/profile-name.component').then(
                (m) => m.ProfileNameComponent,
              ),
          },
          {
            path: 'favorite-team',
            loadComponent: () =>
              import('./features/profile/profile-favorite-team/profile-favorite-team.component').then(
                (m) => m.ProfileFavoriteTeamComponent,
              ),
          },
          {
            path: 'notifications',
            loadComponent: () =>
              import('./features/notifications/notification-settings/notification-settings.component').then(
                (m) => m.NotificationSettingsComponent,
              ),
          },
          {
            path: 'appearance',
            loadComponent: () =>
              import('./features/profile/profile-appearance/profile-appearance.component').then(
                (m) => m.ProfileAppearanceComponent,
              ),
          },
          {
            path: 'language',
            loadComponent: () =>
              import('./features/profile/profile-language/profile-language.component').then(
                (m) => m.ProfileLanguageComponent,
              ),
          },
          {
            path: 'password',
            loadComponent: () =>
              import('./features/profile/profile-change-password/profile-change-password.component').then(
                (m) => m.ProfileChangePasswordComponent,
              ),
          },
        ],
      },
      // Rutas antiguas (marcadores, enlaces): ahora son pestañas de Ajustes.
      { path: 'profile/favorite-team', redirectTo: 'profile/settings/favorite-team' },
      { path: 'profile/appearance', redirectTo: 'profile/settings/appearance' },
      { path: 'profile/change-password', redirectTo: 'profile/settings/password' },
      { path: 'notifications/preferences', redirectTo: 'profile/settings/notifications' },
      {
        path: 'profile/delete-account',
        loadComponent: () =>
          import('./features/profile/profile-delete-account/profile-delete-account.component').then(
            (m) => m.ProfileDeleteAccountComponent,
          ),
      },
      {
        path: 'profile/invite',
        loadComponent: () =>
          import('./features/profile/profile-invite/profile-invite.component').then(
            (m) => m.ProfileInviteComponent,
          ),
      },
      {
        path: 'profile/badges',
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
        path: 'profile/level',
        loadComponent: () =>
          import('./features/profile/level-progress/level-progress.component').then(
            (m) => m.LevelProgressComponent,
          ),
      },
      {
        path: 'profile/trophies/:trophyId/:year',
        loadComponent: () =>
          import('./features/profile/trophy-season/trophy-season.component').then(
            (m) => m.TrophySeasonComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications-page/notifications-page.component').then(
            (m) => m.NotificationsPageComponent,
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
