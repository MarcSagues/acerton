import { Lang, Message, SUPPORTED_LANGS, TranslationKey, catalogOf, currentLocale, detectLanguage, setLanguageForTests, t } from './translate';

const placeholders = (message: Message): string[] => {
  const text = typeof message === 'string' ? message : `${message.one} ${message.other}`;
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
};
const textOf = (message: Message): string => (typeof message === 'string' ? message : `${message.one} ${message.other}`);

/** Todos los idiomas menos el original (el español define las claves). */
const TRANSLATED: readonly Lang[] = SUPPORTED_LANGS.filter((lang) => lang !== 'es');

describe('i18n — catalogos', () => {
  const es = catalogOf('es')!;
  const keys = Object.keys(es) as TranslationKey[];

  it('los seis idiomas están registrados en los tests', () => {
    for (const lang of SUPPORTED_LANGS) expect(catalogOf(lang)).withContext(lang).toBeDefined();
  });

  for (const lang of TRANSLATED) {
    describe(lang, () => {
      const catalog = catalogOf(lang)!;

      it('tiene exactamente las mismas claves que el español', () => {
        expect(Object.keys(catalog).sort()).toEqual([...keys].sort());
      });

      it('cada clave usa los mismos marcadores {x} que el español', () => {
        const mismatches = keys.filter((key) => placeholders(es[key]).join() !== placeholders(catalog[key]).join());
        expect(mismatches).toEqual([]);
      });

      it('ningún texto lleva entidades HTML (&rarr;, &amp;...): los catálogos no se decodifican y saldrían tal cual', () => {
        const withEntity = keys.filter((key) => /&(#\d+|#x[\da-f]+|[a-z]+);/i.test(textOf(catalog[key])));
        expect(withEntity).toEqual([]);
      });

      it('un mensaje con plural lo es también en español y con las dos formas rellenas', () => {
        for (const key of keys) {
          expect(typeof catalog[key]).withContext(key).toBe(typeof es[key]);
          const message = catalog[key];
          if (typeof message === 'string') {
            expect(message.trim()).withContext(key).not.toBe('');
          } else {
            expect(message.one.trim()).withContext(key).not.toBe('');
            expect(message.other.trim()).withContext(key).not.toBe('');
            expect(placeholders(message)).withContext(key).toContain('count');
          }
        }
      });

      if (lang === 'fr') {
        it('en francés el singular también vale para el 0, así que la forma "one" lleva {count} y no un 1 escrito a mano', () => {
          const bad = keys.filter((key) => {
            const message = catalog[key];
            return typeof message !== 'string' && !message.one.includes('{count}');
          });
          expect(bad).toEqual([]);
        });
      }

      it('mantiene los saltos de línea de los títulos grandes', () => {
        const newlines = (message: Message) => (textOf(message).match(/\n/g) ?? []).length;
        const mismatches = keys.filter((key) => newlines(es[key]) !== newlines(catalog[key]));
        expect(mismatches).toEqual([]);
      });
    });
  }

  it('el español sigue siendo la referencia: sin textos vacíos', () => {
    expect(keys.filter((key) => !textOf(es[key]).trim())).toEqual([]);
  });
});

describe('i18n — t()', () => {
  afterEach(() => setLanguageForTests('es'));

  it('sustituye los marcadores en cada idioma', () => {
    setLanguageForTests('es');
    expect(t('levelUpDialog.subisteNivel', { level: 4 })).toBe('¡Subiste al nivel 4!');
    setLanguageForTests('en');
    expect(t('levelUpDialog.subisteNivel', { level: 4 })).toBe('You reached level 4!');
    for (const lang of TRANSLATED) {
      setLanguageForTests(lang);
      const text = t('levelUpDialog.subisteNivel', { level: 4 });
      expect(text).withContext(lang).toContain('4');
      expect(text).withContext(lang).not.toContain('{level}');
    }
  });

  it('elige singular o plural segun count, tambien en ingles', () => {
    setLanguageForTests('en');
    expect(t('copyRules.matches', { count: 1 })).toBe('1 match');
    expect(t('copyRules.matches', { count: 3 })).toBe('3 matches');
    expect(t('copyRules.matches', { count: 0 })).toBe('0 matches');
    setLanguageForTests('es');
    expect(t('copyRules.matches', { count: 1 })).toBe('1 partido');
    expect(t('copyRules.matches', { count: 2 })).toBe('2 partidos');
  });

  it('el plural sigue las reglas de cada idioma (en francés el 0 es singular)', () => {
    for (const lang of TRANSLATED) {
      setLanguageForTests(lang);
      const one = t('copyRules.matches', { count: 1 });
      const many = t('copyRules.matches', { count: 3 });
      expect(many).withContext(lang).toContain('3');
      expect(one).withContext(lang).not.toBe(many.replace('3', '1'));
    }
    setLanguageForTests('fr');
    expect(t('copyRules.matches', { count: 0 })).toBe(t('copyRules.matches', { count: 1 }).replace('1', '0'));
    setLanguageForTests('de');
    expect(t('copyRules.matches', { count: 0 })).toBe(t('copyRules.matches', { count: 3 }).replace('3', '0'));
  });

  it('un valor nulo se pinta vacio y un marcador sin parametro se deja tal cual', () => {
    setLanguageForTests('en');
    expect(t('resetPassword.contrasenasCoinciden')).toBe("Passwords don't match");
    expect(t('common.creado', { createdAt: null })).toBe('Created on ');
    expect(t('common.creado', {})).toBe('Created on {createdAt}');
  });
});

describe('i18n — locale de fechas y números', () => {
  afterEach(() => setLanguageForTests('es'));

  it('cada idioma usa su locale (día/mes en todos)', () => {
    const expected: Record<Lang, string> = { es: 'es-ES', en: 'en-GB', ca: 'ca-ES', fr: 'fr-FR', it: 'it-IT', de: 'de-DE' };
    for (const lang of SUPPORTED_LANGS) {
      setLanguageForTests(lang);
      expect(currentLocale()).withContext(lang).toBe(expected[lang]);
    }
  });
});

describe('i18n — deteccion del idioma', () => {
  it('respeta el idioma guardado aunque el dispositivo este en otro', () => {
    expect(detectLanguage('en', ['es-ES'])).toBe('en');
    expect(detectLanguage('es', ['en-US'])).toBe('es');
    expect(detectLanguage('de', ['fr-FR'])).toBe('de');
    expect(detectLanguage('ca', ['es-ES'])).toBe('ca');
  });

  it('sin eleccion guardada, usa el primer idioma del dispositivo si lo tenemos (con cualquier región)', () => {
    expect(detectLanguage(null, ['en-GB', 'es'])).toBe('en');
    expect(detectLanguage(undefined, ['EN-us'])).toBe('en');
    expect(detectLanguage(null, ['es-ES'])).toBe('es');
    expect(detectLanguage(null, ['ca-ES', 'en'])).toBe('ca');
    expect(detectLanguage(null, ['fr-FR'])).toBe('fr');
    expect(detectLanguage(null, ['fr-CH', 'de'])).toBe('fr');
    expect(detectLanguage(null, ['it'])).toBe('it');
    expect(detectLanguage(null, ['de-AT'])).toBe('de');
    expect(detectLanguage(null, ['de_DE'])).toBe('de');
  });

  it('un idioma que no tenemos se queda en español, aunque el segundo del dispositivo sí lo tengamos', () => {
    expect(detectLanguage(null, ['pt-BR', 'en'])).toBe('es');
    expect(detectLanguage(null, ['gl-ES'])).toBe('es');
    expect(detectLanguage(null, ['eu'])).toBe('es');
    expect(detectLanguage(null, [])).toBe('es');
  });

  it('ignora un valor guardado que no es un idioma soportado', () => {
    expect(detectLanguage('pt', ['en-US'])).toBe('en');
    expect(detectLanguage('xx', ['es-ES'])).toBe('es');
    expect(detectLanguage('fr-FR', ['de'])).toBe('de');
  });
});
