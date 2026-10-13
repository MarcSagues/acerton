import { CHANGELOG as REAL_CHANGELOG, ChangelogEntry } from './changelog';
import { compareVersions, decideWhatsNew, parseVersion } from './changelog.rules';

const entry = (version: string): ChangelogEntry => ({ version, date: '2026-01-01', changes: [{ es: 'a', en: 'b' }] });
const CHANGELOG = [entry('1.2.0'), entry('1.1.0'), entry('1.0.2'), entry('1.0.1')];

describe('versiones', () => {
  it('lee MAYOR.MENOR.PARCHE y rechaza el resto', () => {
    expect(parseVersion('1.0.2')).toEqual([1, 0, 2]);
    expect(parseVersion(' 10.20.30 ')).toEqual([10, 20, 30]);
    for (const bad of ['', '1.0', '1.0.2.1', 'v1.0.2', '1.0.x', 'beta']) expect(parseVersion(bad)).toBeNull();
  });

  it('compara numéricamente, no como texto', () => {
    expect(compareVersions('1.0.10', '1.0.9')).toBeGreaterThan(0);
    expect(compareVersions('1.10.0', '1.9.9')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.0.2', '1.0.2')).toBe(0);
    expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
  });

  it('una versión no válida cuenta como la más antigua', () => {
    expect(compareVersions('1.0.0', 'beta')).toBeGreaterThan(0);
    expect(compareVersions('beta', '1.0.0')).toBeLessThan(0);
  });
});

describe('decideWhatsNew', () => {
  const decide = (currentVersion: string, lastSeenVersion: string | null, isNewUser = false) =>
    decideWhatsNew({ changelog: CHANGELOG, currentVersion, lastSeenVersion, isNewUser });
  const shownVersions = (currentVersion: string, lastSeenVersion: string | null) => {
    const decision = decide(currentVersion, lastSeenVersion);
    return decision.action === 'show' ? decision.entries.map((e) => e.version) : decision.action;
  };

  it('la misma versión que la última vez: nada (solo sale la primera vez)', () => {
    expect(decide('1.0.2', '1.0.2')).toEqual({ action: 'none' });
  });

  it('una versión nueva enseña sus novedades', () => {
    expect(shownVersions('1.1.0', '1.0.2')).toEqual(['1.1.0']);
  });

  it('si se saltó alguna versión, enseña también las de en medio, de la más nueva a la más antigua', () => {
    expect(shownVersions('1.2.0', '1.0.1')).toEqual(['1.2.0', '1.1.0', '1.0.2']);
  });

  it('no enseña las versiones posteriores a la instalada (entradas ya escritas de una versión aún sin publicar)', () => {
    expect(shownVersions('1.0.2', '1.0.1')).toEqual(['1.0.2']);
  });

  it('sin versión previa guardada (se actualiza desde una versión sin este aviso): todo lo posterior a la 1.0.1', () => {
    expect(shownVersions('1.1.0', null)).toEqual(['1.1.0', '1.0.2']);
    expect(shownVersions('1.2.0', null)).toEqual(['1.2.0', '1.1.0', '1.0.2']);
  });

  it('un usuario nuevo sin versión previa: se apunta la versión y no se enseña nada', () => {
    expect(decide('1.1.0', null, true)).toEqual({ action: 'remember' });
  });

  it('un usuario nuevo con una versión ya guardada se trata como cualquier otro', () => {
    expect(shownVersions('1.1.0', '1.0.2')).toEqual(['1.1.0']);
  });

  it('una versión más antigua que la guardada (se reinstaló una build anterior): nada, y no se pisa la guardada', () => {
    expect(decide('1.0.1', '1.1.0')).toEqual({ action: 'none' });
  });

  it('una versión sin entrada en el historial ni novedades entre medias se apunta y no se enseña nada', () => {
    expect(decide('1.0.3', '1.0.2')).toEqual({ action: 'remember' });
    expect(decide('1.0.1', null)).toEqual({ action: 'remember' });
  });
});

describe('el titular del Quiz (1.1.0, historial real)', () => {
  const quizEntries = (decision: ReturnType<typeof decideWhatsNew>) =>
    decision.action === 'show' ? decision.entries.filter((e) => e.changes.some((c) => c.headline)) : [];

  it('sale al actualizar a la 1.1.0 desde una anterior', () => {
    const decision = decideWhatsNew({ changelog: REAL_CHANGELOG, currentVersion: '1.1.0', lastSeenVersion: '1.0.2', isNewUser: false });
    expect(quizEntries(decision).map((e) => e.version)).toEqual(['1.1.0']);
  });

  it('no sale a quien ya vio la 1.1.0, ni al pasar a una versión posterior', () => {
    const again = decideWhatsNew({ changelog: REAL_CHANGELOG, currentVersion: '1.1.0', lastSeenVersion: '1.1.0', isNewUser: false });
    const later = decideWhatsNew({ changelog: REAL_CHANGELOG, currentVersion: '1.1.1', lastSeenVersion: '1.1.0', isNewUser: false });
    expect(quizEntries(again)).toEqual([]);
    expect(quizEntries(later)).toEqual([]);
  });

  it('tampoco sale a un usuario nuevo', () => {
    const decision = decideWhatsNew({ changelog: REAL_CHANGELOG, currentVersion: '1.1.0', lastSeenVersion: null, isNewUser: true });
    expect(quizEntries(decision)).toEqual([]);
  });
});
