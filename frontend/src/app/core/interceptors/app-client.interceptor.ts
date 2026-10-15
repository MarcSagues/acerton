import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { appClientInfo } from '../app-client/app-client';
import { AppGateService } from '../app-client/app-gate.service';

/**
 * Le dice al backend que app le llama (X-App-Platform, X-App-Version), para que
 * pueda contestar a cada version lo que entiende, y enseña la pantalla de
 * mantenimiento si contesta 503 con `maintenance: true`. Solo a nuestra API.
 */
export const appClientInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  const gate = inject(AppGateService);

  return from(appClientInfo()).pipe(
    switchMap(({ platform, version }) =>
      next(req.clone({ setHeaders: { 'X-App-Platform': platform, 'X-App-Version': version } })),
    ),
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 503 && error.error?.maintenance === true) {
        gate.enterMaintenance();
      }
      return throwError(() => error);
    }),
  );
};
