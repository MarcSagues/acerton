import { xpForLevel, xpProgressForLevel } from './xp.util';

describe('xp.util', () => {
  it('xpForLevel crece 150 por nivel a partir de un base de 200', () => {
    expect(xpForLevel(1)).toBe(200);
    expect(xpForLevel(2)).toBe(350);
    expect(xpForLevel(7)).toBe(1100);
  });

  it('xpProgressForLevel se queda en nivel 1 con 0 XP', () => {
    expect(xpProgressForLevel(0)).toEqual({ level: 1, currentLevelXp: 0, neededForLevel: 200 });
  });

  it('xpProgressForLevel sube de nivel al completar el XP del nivel actual', () => {
    // Nivel 1 pide 200, nivel 2 pide 350: con 250 XP total ya esta en nivel 2 con 50 dentro de ese nivel.
    expect(xpProgressForLevel(250)).toEqual({ level: 2, currentLevelXp: 50, neededForLevel: 350 });
  });

  it('xpProgressForLevel nunca pasa del nivel maximo (18)', () => {
    const progress = xpProgressForLevel(999_999);
    expect(progress.level).toBe(18);
  });
});
