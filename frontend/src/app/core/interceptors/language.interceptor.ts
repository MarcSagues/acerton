import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { currentLang } from '../i18n/translate';

/**
 * Le dice al backend en que idioma contestar (mensajes de error, correos). Va
 * en la cabecera estandar Accept-Language con el idioma elegido en la app, no
 * el del navegador, y solo a nuestra API.
 */
export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith(environment.apiUrl)) return next(req);
  return next(req.clone({ setHeaders: { 'Accept-Language': currentLang() } }));
};
