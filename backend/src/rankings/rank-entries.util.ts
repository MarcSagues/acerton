export interface ScoredEntry {
  userId: string;
  points: number;
}

export interface RankedEntry extends ScoredEntry {
  position: number;
}

/**
 * Ranking estilo "1224": los empates comparten posicion y la siguiente
 * posicion salta segun el numero de empatados (ej. 1,1,3,4).
 */
export function rankEntries(entries: ScoredEntry[]): RankedEntry[] {
  const sorted = [...entries].sort((a, b) => b.points - a.points);
  const ranked: RankedEntry[] = [];
  let lastPoints: number | null = null;
  let lastPosition = 0;

  sorted.forEach((entry, index) => {
    if (entry.points !== lastPoints) {
      lastPosition = index + 1;
      lastPoints = entry.points;
    }
    ranked.push({ ...entry, position: lastPosition });
  });

  return ranked;
}
