import { Locale } from './locale';
import { messages as ca, patterns as caPatterns } from './messages/ca';
import { messages as de, patterns as dePatterns } from './messages/de';
import { messages as en, patterns as enPatterns } from './messages/en';
import { messages as fr, patterns as frPatterns } from './messages/fr';
import { messages as it, patterns as itPatterns } from './messages/it';

/**
 * Mensajes de error que ve el usuario (los que lanzan los servicios con
 * `new XxxException('...')` y los de validacion de los DTO). El texto en
 * espanol, tal como esta escrito en el codigo, es la clave; cada idioma tiene su
 * diccionario en messages/<idioma>.ts y error-messages.spec.ts comprueba que cada
 * mensaje del codigo esta traducido en todos, asi que anadir un error nuevo sin
 * traducir rompe el test.
 */
export type PatternId = 'nameChangeCooldown' | 'mascotLevel' | 'colorLevel';

interface Dictionary {
  messages: Record<string, string>;
  patterns: Record<PatternId, string>;
}

const DICTIONARIES: Record<Exclude<Locale, 'es'>, Dictionary> = {
  en: { messages: en, patterns: enPatterns as Dictionary['patterns'] },
  ca: { messages: ca, patterns: caPatterns as Dictionary['patterns'] },
  fr: { messages: fr, patterns: frPatterns as Dictionary['patterns'] },
  it: { messages: it, patterns: itPatterns as Dictionary['patterns'] },
  de: { messages: de, patterns: dePatterns as Dictionary['patterns'] },
};

/** Mensajes con datos dentro (fechas, niveles): se reconocen por su forma y se vuelven a escribir con esos datos. */
export const ERROR_PATTERNS: ReadonlyArray<{ id: PatternId; pattern: RegExp }> = [
  {
    id: 'nameChangeCooldown',
    pattern:
      /^Solo puedes cambiar el nombre una vez por semana\. Podras hacerlo de nuevo el (.+)\.$/,
  },
  { id: 'mascotLevel', pattern: /^Necesitas el nivel (\d+) para usar esta mascota\.$/ },
  { id: 'colorLevel', pattern: /^Necesitas el nivel (\d+) para usar este color\.$/ },
];

export function translateErrorMessage(message: string, locale: Locale): string {
  if (locale === 'es') return message;
  const dictionary = DICTIONARIES[locale];
  const exact = dictionary.messages[message];
  if (exact) return exact;
  for (const { id, pattern } of ERROR_PATTERNS) {
    const match = message.match(pattern);
    if (match)
      return dictionary.patterns[id].replace(
        /\{(\d+)\}/g,
        (_, i: string) => match[Number(i)] ?? '',
      );
  }
  return message;
}
