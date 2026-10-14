import { currentLang } from './app/core/i18n/translate';
import { loadActiveLanguage } from './app/core/i18n/language-loader';

document.documentElement.lang = currentLang();

// El idioma se descarga ANTES de cargar la app: asi todo lo que se evalua al
// importar sus modulos (constantes con t(), etc.) ya lo tiene. Si fallara la
// descarga, la app arranca en espanol (el catalogo que siempre va dentro).
loadActiveLanguage()
  .catch((err) => console.error(err))
  .then(() =>
    Promise.all([import('@angular/platform-browser'), import('./app/app.config'), import('./app/app.component')]),
  )
  .then(([{ bootstrapApplication }, { appConfig }, { AppComponent }]) => bootstrapApplication(AppComponent, appConfig))
  .catch((err) => console.error(err));
