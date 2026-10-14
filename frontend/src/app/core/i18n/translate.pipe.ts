import { Pipe, PipeTransform } from '@angular/core';
import { Params, TranslationKey, t } from './translate';

/**
 * `{{ 'tuJornada' | t }}` / `{{ 'cierraEn' | t: { time: countdown } }}`.
 * Pura a proposito: el idioma no cambia en caliente (cambiarlo recarga la
 * app), asi que solo depende de sus argumentos.
 */
@Pipe({ name: 't', standalone: true })
export class TranslatePipe implements PipeTransform {
  transform(key: TranslationKey, params?: Params): string {
    return t(key, params);
  }
}
