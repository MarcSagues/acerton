import { distinctBadgeCount } from './badge-count';

const row = (code: string) => ({ badge: { code } });

describe('distinctBadgeCount', () => {
  it('sin insignias, 0', () => {
    expect(distinctBadgeCount([])).toBe(0);
  });

  it('cada insignia cuenta una vez aunque se tenga en varios grupos', () => {
    const rows = [row('FOUNDER'), row('FOUNDER'), row('FOUNDER'), row('STREAK_5'), row('STREAK_5'), row('PERFECT')];
    expect(rows.length).toBe(6);
    expect(distinctBadgeCount(rows)).toBe(3);
  });

  it('con una fila por insignia, las filas', () => {
    expect(distinctBadgeCount([row('A'), row('B'), row('C')])).toBe(3);
  });
});
