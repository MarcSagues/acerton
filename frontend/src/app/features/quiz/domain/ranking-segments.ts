import { QuizRankingRow } from '../../../core/models/quiz.model';

/**
 * La clasificacion del Quiz se carga por tramos de filas contiguas (`rowNumber`). Al abrir hay uno solo (los primeros); al saltar a
 * "mi puesto" cuando esta lejos se carga otro tramo alrededor de la fila propia, y entre los dos queda un hueco que se va cerrando
 * con el scroll infinito (hacia abajo desde cada tramo) o con el boton del hueco (hacia arriba desde el segundo tramo).
 */
export interface RankingSegment {
  /** `rowNumber` de la primera fila del tramo. */
  start: number;
  /** `rowNumber` de la ultima fila del tramo. */
  end: number;
  rows: QuizRankingRow[];
}

export type RankingItem =
  | { kind: 'row'; key: string; row: QuizRankingRow }
  /** Centinela del scroll infinito: al verse, carga la pagina que sigue a la fila `end`. */
  | { kind: 'more'; key: string; end: number }
  /** Filas sin cargar entre dos tramos: el boton carga las que preceden al tramo que empieza en `before`. */
  | { kind: 'gap'; key: string; hidden: number; before: number };

export function segmentFromRows(rows: readonly QuizRankingRow[]): RankingSegment | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => a.rowNumber - b.rowNumber);
  return { start: sorted[0].rowNumber, end: sorted[sorted.length - 1].rowNumber, rows: sorted };
}

/** Anade un tramo a los ya cargados: los que se solapan o se tocan se unen (sin filas repetidas) y el resultado va ordenado. */
export function mergeSegment(segments: readonly RankingSegment[], incoming: RankingSegment): RankingSegment[] {
  const all = [...segments, incoming].sort((a, b) => a.start - b.start);
  const merged: RankingSegment[] = [];
  for (const segment of all) {
    const last = merged[merged.length - 1];
    if (last && segment.start <= last.end + 1) {
      const byRow = new Map<number, QuizRankingRow>();
      for (const row of [...last.rows, ...segment.rows]) byRow.set(row.rowNumber, row);
      const rows = [...byRow.values()].sort((a, b) => a.rowNumber - b.rowNumber);
      merged[merged.length - 1] = { start: last.start, end: Math.max(last.end, segment.end), rows };
    } else {
      merged.push({ ...segment, rows: [...segment.rows] });
    }
  }
  return merged;
}

/** La lista tal como se pinta: filas, un centinela tras cada tramo al que aun le faltan filas, y un hueco entre tramos separados. */
export function buildRankingItems(segments: readonly RankingSegment[], total: number): RankingItem[] {
  const items: RankingItem[] = [];
  segments.forEach((segment, index) => {
    for (const row of segment.rows) items.push({ kind: 'row', key: `row-${row.userId}`, row });
    const next = segments[index + 1];
    if (next) {
      items.push({ kind: 'more', key: `more-${segment.end}`, end: segment.end });
      items.push({ kind: 'gap', key: `gap-${next.start}`, hidden: next.start - segment.end - 1, before: next.start });
    } else if (segment.end < total) {
      items.push({ kind: 'more', key: `more-${segment.end}`, end: segment.end });
    }
  });
  return items;
}

/**
 * Pagina que precede a la fila `start`: `cursor` es el numero de filas a saltar (el servidor devuelve las que van despues) y
 * `limit` cuantas pedir. null si `start` ya es la primera fila.
 */
export function pageBefore(start: number, pageSize: number): { cursor: number; limit: number } | null {
  if (start <= 1) return null;
  const cursor = Math.max(0, start - 1 - pageSize);
  return { cursor, limit: start - 1 - cursor };
}

/** Ventana de filas alrededor de la fila `rowNumber`: `radius` por arriba, la propia y `radius` por abajo. */
export function windowAround(rowNumber: number, radius: number): { cursor: number; limit: number } {
  const cursor = Math.max(0, rowNumber - 1 - radius);
  return { cursor, limit: rowNumber - cursor + radius };
}
