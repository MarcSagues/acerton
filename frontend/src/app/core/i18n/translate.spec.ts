import { CATALOGS_FOR_TESTS, Message, TranslationKey, detectLanguage, setLanguageForTests, t } from './translate';

const placeholders = (message: Message): string[] => {
  const text = typeof message === 'string' ? message : `${message.one} ${message.other}`;
  return [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
};

describe('i18n — catalogos', () => {
  const { es, en } = CATALOGS_FOR_TESTS;
  const keys = Object.keys(es) as TranslationKey[];

  it('ingles y espanol tienen exactamente las mismas claves', () => {
    expect(Object.keys(en).sort()).toEqual([...keys].sort());
  });

  it('cada clave usa los mismos marcadores {x} en los dos idiomas', () => {
    const mismatches = keys.filter((key) => placeholders(es[key]).join() !== placeholders(en[key]).join());
    expect(mismatches).toEqual([]);
  });

  it('ningún texto lleva entidades HTML (&rarr;, &amp;...): los catálogos no se decodifican y saldrían tal cual', () => {
    const withEntity = keys.filter((key) =>
      [es[key], en[key]].some((message) => /&(#\d+|#x[\da-f]+|[a-z]+);/i.test(typeof message === 'string' ? message : `${message.one} ${message.other}`)),
    );
    expect(withEntity).toEqual([]);
  });

  it('un mensaje con plural lo es en los dos idiomas y con las dos formas rellenas', () => {
    for (const key of keys) {
      expect(typeof en[key]).withContext(key).toBe(typeof es[key]);
      for (const catalog of [es, en]) {
        const message = catalog[key];
        if (typeof message === 'string') {
          expect(message.trim()).withContext(key).not.toBe('');
        } else {
          expect(message.one.trim()).withContext(key).not.toBe('');
          expect(message.other.trim()).withContext(key).not.toBe('');
          expect(placeholders(message)).withContext(key).toContain('count');
        }
      }
    }
  });
});

describe('i18n — t()', () => {
  afterEach(() => setLanguageForTests('es'));

  it('sustituye los marcadores en cada idioma', () => {
    setLanguageForTests('es');
    expect(t('levelUpDialog.subisteNivel', { level: 4 })).toBe('¡Subiste al nivel 4!');
    setLanguageForTests('en');
    expect(t('levelUpDialog.subisteNivel', { level: 4 })).toBe('You reached level 4!');
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

  it('un valor nulo se pinta vacio y un marcador sin parametro se deja tal cual', () => {
    setLanguageForTests('en');
    expect(t('resetPassword.contrasenasCoinciden')).toBe("Passwords don't match");
    expect(t('common.creado', { createdAt: null })).toBe('Created on ');
    expect(t('common.creado', {})).toBe('Created on {createdAt}');
  });
});

describe('i18n — deteccion del idioma', () => {
  it('respeta el idioma guardado aunque el dispositivo este en otro', () => {
    expect(detectLanguage('en', ['es-ES'])).toBe('en');
    expect(detectLanguage('es', ['en-US'])).toBe('es');
  });

  it('sin eleccion guardada, ingles solo si el dispositivo esta en ingles', () => {
    expect(detectLanguage(null, ['en-GB', 'es'])).toBe('en');
    expect(detectLanguage(undefined, ['EN-us'])).toBe('en');
    expect(detectLanguage(null, ['es-ES'])).toBe('es');
    expect(detectLanguage(null, ['ca-ES', 'en'])).toBe('es');
    expect(detectLanguage(null, ['fr-FR'])).toBe('es');
    expect(detectLanguage(null, [])).toBe('es');
  });

  it('ignora un valor guardado que no es un idioma soportado', () => {
    expect(detectLanguage('fr', ['en-US'])).toBe('en');
    expect(detectLanguage('xx', ['es-ES'])).toBe('es');
  });
});
