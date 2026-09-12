import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, firstValueFrom, from, map, of, switchMap, tap, throwError } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { environment } from '../../../environments/environment';
import { User } from '../models/user.model';

interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUserSignal = signal<User | null>(null);
  private readonly accessTokenSignal = signal<string | null>(null);
  private readonly bootstrappedSignal = signal(false);

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly accessToken = this.accessTokenSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly bootstrapped = this.bootstrappedSignal.asReadonly();

  readonly googleLoginUrl = `${environment.apiUrl}/auth/google`;
  /** En la app nativa (Capacitor) el login con Google usa el SDK del dispositivo en vez de la redireccion web — ver loginWithGoogleNative. */
  readonly isNativePlatform = Capacitor.isNativePlatform();
  private googleSignInInitialized = false;

  constructor(private readonly http: HttpClient) {}

  /**
   * No inicia sesion: la cuenta queda sin verificar hasta confirmar el
   * correo (ver login, que la bloquea, y verifyEmail, que la confirma e
   * inicia sesion de una vez).
   */
  register(payload: RegisterPayload): Observable<{ email: string }> {
    return this.http.post<{ email: string }>(`${environment.apiUrl}/auth/register`, payload);
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Confirma la cuenta desde el enlace del correo e inicia sesion de una vez. */
  verifyEmail(token: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/verify-email`, { token }, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
  }

  /** Respuesta identica exista o no la cuenta, o ya este verificada: nunca revela si un email esta registrado. */
  resendVerification(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/resend-verification`, { email });
  }

  /** Respuesta identica exista o no la cuenta, o sea solo-Google: nunca revela si un email esta registrado. */
  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${environment.apiUrl}/auth/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<{ success: true }> {
    return this.http.post<{ success: true }>(`${environment.apiUrl}/auth/reset-password`, { token, newPassword });
  }

  /** Cambio de contrasena estando ya conectado (Ajustes de Perfil) — distinto de forgotPassword/resetPassword. */
  changePassword(currentPassword: string, newPassword: string): Observable<{ success: true }> {
    return this.http.patch<{ success: true }>(`${environment.apiUrl}/auth/me/password`, {
      currentPassword,
      newPassword,
    });
  }

  /** Intenta recuperar sesion a partir de la cookie de refresh (arranque de la app o F5). */
  bootstrap(): Observable<boolean> {
    return this.http
      .post<{ accessToken: string }>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => this.accessTokenSignal.set(res.accessToken)),
        switchMap(() => this.http.get<User>(`${environment.apiUrl}/users/me`)),
        tap((user) => this.currentUserSignal.set(user)),
        map(() => true),
        catchError(() => {
          this.clearSession();
          return of(false);
        }),
        tap(() => this.bootstrappedSignal.set(true)),
      );
  }

  refreshAccessToken(): Observable<string> {
    return this.http
      .post<{ accessToken: string }>(`${environment.apiUrl}/auth/refresh`, {}, { withCredentials: true })
      .pipe(
        tap((res) => this.accessTokenSignal.set(res.accessToken)),
        map((res) => res.accessToken),
        catchError((error) => {
          this.clearSession();
          return throwError(() => error);
        }),
      );
  }

  /** Tras volver del callback de Google OAuth con el accessToken en la URL. */
  completeGoogleLogin(accessToken: string): Observable<User> {
    this.accessTokenSignal.set(accessToken);
    return this.http.get<User>(`${environment.apiUrl}/users/me`).pipe(
      tap((user) => this.currentUserSignal.set(user)),
      catchError((error) => {
        this.clearSession();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Login con Google en la app nativa: el SDK on-device (Credential Manager
   * en Android, Google Sign-In SDK en iOS) entrega un idToken ya firmado sin
   * necesidad de redirigir a un navegador — se manda tal cual al backend
   * (ver AuthController.googleToken), que es quien de verdad lo verifica.
   */
  loginWithGoogleNative(): Observable<AuthResponse> {
    return from(this.performGoogleNativeSignIn()).pipe(tap((res) => this.setSession(res)));
  }

  private async performGoogleNativeSignIn(): Promise<AuthResponse> {
    if (!this.googleSignInInitialized) {
      await GoogleSignIn.initialize({ clientId: environment.googleWebClientId });
      this.googleSignInInitialized = true;
    }
    const result = await GoogleSignIn.signIn();
    return firstValueFrom(
      this.http.post<AuthResponse>(
        `${environment.apiUrl}/auth/google/token`,
        { idToken: result.idToken },
        { withCredentials: true },
      ),
    );
  }

  /** Refleja en el signal local un usuario ya actualizado en el backend (ej. tras cambiar el nombre). */
  setCurrentUser(user: User): void {
    this.currentUserSignal.set(user);
  }

  logout(): Observable<unknown> {
    return this.http
      .post(`${environment.apiUrl}/auth/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearSession()));
  }

  private setSession(res: AuthResponse): void {
    this.currentUserSignal.set(res.user);
    this.accessTokenSignal.set(res.accessToken);
  }

  private clearSession(): void {
    this.currentUserSignal.set(null);
    this.accessTokenSignal.set(null);
  }
}
