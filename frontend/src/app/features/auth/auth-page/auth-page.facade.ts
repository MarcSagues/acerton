import { Injectable, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorCode } from '@capawesome/capacitor-google-sign-in';
import { AuthService } from '../../../core/services/auth.service';
import { GroupsService } from '../../../core/services/groups.service';
import { usernameHint, usernameValidator } from '../../../shared/username.util';
import { environment } from '../../../../environments/environment';
import { GOOGLE_RETURN_URL_KEY } from './auth-page.constants';

type AuthMode = 'login' | 'register';

@Injectable()
export class AuthPageFacade {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly groupsService = inject(GroupsService);

  readonly mode = signal<AuthMode>('login');
  readonly isRegister = computed(() => this.mode() === 'register');
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly passwordVisible = signal(false);
  readonly googleLoginUrl = this.authService.googleLoginUrl;
  readonly isNativePlatform = this.authService.isNativePlatform;
  readonly diagnostics = signal<string | null>(null);
  readonly runningDiagnostics = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  init(): void {
    const initialMode = (this.route.snapshot.data['mode'] as AuthMode) ?? 'login';
    this.setMode(initialMode);
  }

  setMode(mode: AuthMode): void {
    this.mode.set(mode);
    this.errorMessage.set(null);
    const nameControl = this.form.controls.name;
    if (mode === 'register') {
      nameControl.setValidators([Validators.required, usernameValidator()]);
    } else {
      nameControl.clearValidators();
    }
    nameControl.updateValueAndValidity();
    // preserve: cambiar de pestana (o el redirect inicial de ngOnInit) no
    // debe perder un ?returnUrl= que auth.guard haya puesto ahi para volver
    // al enlace directo original tras iniciar sesion.
    this.router.navigate([mode === 'register' ? '/register' : '/login'], { queryParamsHandling: 'preserve' });
  }

  /** Feedback en vivo mientras se escribe, sin esperar a que se toque el campo o se intente enviar. */
  nameHint(): string | null {
    if (!this.isRegister()) return null;
    const control = this.form.controls.name;
    if (!control.value) return null;
    return usernameHint(control.errors);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((v) => !v);
  }

  /**
   * Si se llego aqui porque auth.guard interrumpio una ruta concreta (ej. un
   * enlace de invitacion a un grupo), vuelve ahi mismo tras iniciar sesion en
   * vez de mandar siempre al destino generico segun numero de grupos.
   */
  private navigateAfterLogin(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl) {
      this.router.navigateByUrl(returnUrl);
      return;
    }
    this.groupsService.postLoginRoute().subscribe((route) => this.router.navigate(route));
  }

  saveReturnUrlForGoogleRedirect(): void {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    try {
      if (returnUrl) {
        sessionStorage.setItem(GOOGLE_RETURN_URL_KEY, returnUrl);
      } else {
        sessionStorage.removeItem(GOOGLE_RETURN_URL_KEY);
      }
    } catch {
      /* sessionStorage no disponible: se pierde el destino, cae al genérico tras el login */
    }
  }

  loginWithGoogleNative(): void {
    this.loading.set(true);
    this.errorMessage.set(null);
    this.authService.loginWithGoogleNative().subscribe({
      next: () => {
        this.loading.set(false);
        this.navigateAfterLogin();
      },
      error: (error) => {
        this.loading.set(false);
        // El usuario simplemente cerro el selector de cuenta: no es un fallo que mostrar.
        if (error?.code === ErrorCode.SignInCanceled) return;
        // Temporal: mostrar el detalle real del fallo para poder diagnosticarlo en TestFlight.
        if (error instanceof HttpErrorResponse) {
          this.errorMessage.set(
            `No se pudo iniciar sesion con Google (backend ${error.status}): ${JSON.stringify(error.error)}`,
          );
        } else {
          this.errorMessage.set(
            `No se pudo iniciar sesion con Google (${error?.code ?? 'sin codigo'}): ${error?.message ?? JSON.stringify(error)}`,
          );
        }
      },
    });
  }

  /** Temporal: diagnostico de red en el propio dispositivo, sin acceso a un Mac/inspector. */
  async runDiagnostics(): Promise<void> {
    this.runningDiagnostics.set(true);
    this.diagnostics.set(null);
    const lines: string[] = [];
    lines.push(`onLine: ${navigator.onLine}`);
    lines.push(`UA: ${navigator.userAgent}`);

    const probe = async (label: string, url: string, init?: RequestInit) => {
      const start = Date.now();
      try {
        const res = await fetch(url, init);
        lines.push(`${label}: OK status=${res.status} (${Date.now() - start}ms)`);
      } catch (err) {
        lines.push(`${label}: FALLO ${(err as Error)?.name ?? ''} ${(err as Error)?.message ?? String(err)} (${Date.now() - start}ms)`);
      }
    };

    await probe('mismo origen (manifest)', 'https://acerton.app/manifest.webmanifest');
    await probe('api sin credenciales', `${environment.apiUrl}/competitions`);
    await probe('api con credenciales', `${environment.apiUrl}/competitions`, { credentials: 'include' });
    await probe('api directa https', 'https://api.acerton.app/api/competitions');

    this.diagnostics.set(lines.join('\n'));
    this.runningDiagnostics.set(false);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);
    const { name, email, password } = this.form.getRawValue();

    const request = this.isRegister()
      ? this.authService.register({ name: name.trim(), email, password })
      : this.authService.login({ email, password });

    request.subscribe({
      next: () => {
        this.loading.set(false);
        this.navigateAfterLogin();
      },
      error: (error: HttpErrorResponse) => {
        this.loading.set(false);
        this.errorMessage.set(
          error.error?.message ?? (this.isRegister() ? 'No se pudo crear la cuenta' : 'No se pudo iniciar sesion'),
        );
      },
    });
  }
}
