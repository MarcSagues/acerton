import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { currentLang } from './app/core/i18n/translate';
import { registerAppLocales } from './app/core/i18n/locale';

registerAppLocales();
document.documentElement.lang = currentLang();

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
