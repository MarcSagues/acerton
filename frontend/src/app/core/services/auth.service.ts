import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, switchMap, tap, throwError } from 'rxjs';
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

  constructor(private readonly http: HttpClient) {}

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, payload, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, payload, { withCredentials: true })
      .pipe(tap((res) => this.setSession(res)));
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
