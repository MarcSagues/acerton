import { CHANGELOG } from './changelog';
import { compareVersions, parseVersion } from './changelog.rules';

describe('CHANGELOG (historial de versiones)', () => {
  it('tiene al menos una entrada', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it('cada versión es MAYOR.MENOR.PARCHE y no se repite', () => {
    const versions = CHANGELOG.map((entry) => entry.version);
    for (const version of versions) expect(parseVersion(version)).withContext(version).not.toBeNull();
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('va de la versión más nueva a la más antigua', () => {
    const versions = CHANGELOG.map((entry) => entry.version);
    const newestFirst = [...versions].sort((a, b) => compareVersions(b, a));
    expect(versions).toEqual(newestFirst);
  });

  it('las fechas son AAAA-MM-DD reales y no crecen hacia abajo', () => {
    for (const entry of CHANGELOG) {
      expect(entry.date).withContext(entry.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.date))).withContext(entry.version).toBe(false);
    }
    const dates = CHANGELOG.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('cada versión tiene cambios, y cada cambio está en español e inglés', () => {
    for (const entry of CHANGELOG) {
      expect(entry.changes.length).withContext(entry.version).toBeGreaterThan(0);
      for (const change of entry.changes) {
        expect(change.es.trim()).withContext(`${entry.version} es`).not.toBe('');
        expect(change.en.trim()).withContext(`${entry.version} en`).not.toBe('');
        expect(change.en).withContext(`${entry.version}: sin traducir`).not.toBe(change.es);
        // ca/fr/it/de son opcionales (si faltan, el pop-up usa el ingles), pero si estan, tienen que ser texto de verdad.
        for (const lang of ['ca', 'fr', 'it', 'de'] as const) {
          const text = change[lang];
          if (text === undefined) continue;
          expect(text.trim()).withContext(`${entry.version} ${lang}`).not.toBe('');
          expect(text).withContext(`${entry.version} ${lang}: sin traducir`).not.toBe(change.es);
        }
      }
    }
  });
});
