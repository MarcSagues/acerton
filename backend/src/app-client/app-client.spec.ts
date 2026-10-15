import { appSupports, compareVersions, parseAppClient } from './app-client';

describe('parseAppClient', () => {
  it('lee plataforma y version de las cabeceras', () => {
    expect(parseAppClient({ 'x-app-platform': 'iOS', 'x-app-version': '1.1.2' })).toEqual({
      platform: 'ios',
      version: '1.1.2',
    });
  });

  it('sin cabeceras (o con una plataforma desconocida) es la app 1.1.0/1.1.1', () => {
    expect(parseAppClient({})).toEqual({ platform: 'legacy', version: null });
    expect(parseAppClient({ 'x-app-platform': 'tv', 'x-app-version': '9.0.0' })).toEqual({
      platform: 'legacy',
      version: null,
    });
  });

  it('ignora una version ilegible', () => {
    expect(parseAppClient({ 'x-app-platform': 'android', 'x-app-version': '1.2-beta' })).toEqual({
      platform: 'android',
      version: null,
    });
  });
});

describe('compareVersions', () => {
  it('compara numero a numero, no como texto', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('1.1.1', '1.1.2')).toBeLessThan(0);
  });
});

describe('appSupports', () => {
  it('la web siempre; la app nativa segun su version; la antigua nunca', () => {
    expect(appSupports({ platform: 'web', version: null }, '9.9.9')).toBe(true);
    expect(appSupports({ platform: 'ios', version: '1.1.3' }, '1.1.3')).toBe(true);
    expect(appSupports({ platform: 'android', version: '1.1.2' }, '1.1.3')).toBe(false);
    expect(appSupports({ platform: 'legacy', version: null }, '1.0.0')).toBe(false);
  });
});
