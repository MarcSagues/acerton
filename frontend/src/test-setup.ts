// Se carga DESPUES de test-language.ts (que fija el idioma antes de que se evalue core/i18n/translate).
// Los tests usan todos los idiomas: en la app solo se descarga el que se usa
// (ver core/i18n/language-loader.ts), aqui se registran todos de golpe.
import { ca } from './app/core/i18n/ca';
import { de } from './app/core/i18n/de';
import { en } from './app/core/i18n/en';
import { fr } from './app/core/i18n/fr';
import { it as italian } from './app/core/i18n/it';
import { registerCatalog } from './app/core/i18n/translate';

registerCatalog('en', en);
registerCatalog('ca', ca);
registerCatalog('fr', fr);
registerCatalog('it', italian);
registerCatalog('de', de);
