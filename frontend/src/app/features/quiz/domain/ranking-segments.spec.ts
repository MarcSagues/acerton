import { QuizRankingRow } from '../../../core/models/quiz.model';
import { buildRankingItems, mergeSegment, pageBefore, segmentFromRows, windowAround } from './ranking-segments';

const row = (rowNumber: number): QuizRankingRow => ({
  position: rowNumber,
  rowNumber,
  userId: `u${rowNumber}`,
  name: `Jugador ${rowNumber}`,
  avatarUrl: null,
  avatarBackground: null,
  points: 100 - rowNumber,
  quizzesPlayed: 1,
});

const rows = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => row(from + i));
const segment = (from: number, to: number) => segmentFromRows(rows(from, to))!;

describe('ranking-segments', () => {
  describe('segmentFromRows', () => {
    it('toma el inicio y el fin de las filas, ordenadas', () => {
      const result = segmentFromRows([row(5), row(3), row(4)])!;

      expect(result.start).toBe(3);
      expect(result.end).toBe(5);
      expect(result.rows.map((r) => r.rowNumber)).toEqual([3, 4, 5]);
    });

    it('sin filas no hay tramo', () => {
      expect(segmentFromRows([])).toBeNull();
    });
  });

  describe('mergeSegment', () => {
    it('un tramo separado se queda aparte, ordenado', () => {
      const merged = mergeSegment([segment(1, 20)], segment(190, 210));

      expect(merged.map((s) => [s.start, s.end])).toEqual([
        [1, 20],
        [190, 210],
      ]);
    });

    it('los tramos que se tocan o se solapan se unen sin repetir filas', () => {
      const touching = mergeSegment([segment(1, 20)], segment(21, 40));
      const overlapping = mergeSegment([segment(1, 25)], segment(20, 40));

      expect(touching.map((s) => [s.start, s.end])).toEqual([[1, 40]]);
      expect(overlapping.map((s) => [s.start, s.end])).toEqual([[1, 40]]);
      expect(overlapping[0].rows.map((r) => r.rowNumber)).toEqual(rows(1, 40).map((r) => r.rowNumber));
    });

    it('cerrar el hueco entre dos tramos los junta en uno', () => {
      const start = mergeSegment([segment(1, 20)], segment(41, 60));

      const closed = mergeSegment(start, segment(21, 40));

      expect(closed.map((s) => [s.start, s.end])).toEqual([[1, 60]]);
    });

    it('no modifica los tramos de entrada', () => {
      const original = [segment(1, 20)];

      mergeSegment(original, segment(21, 30));

      expect(original[0].end).toBe(20);
    });
  });

  describe('buildRankingItems', () => {
    it('con un tramo al que aun le faltan filas termina con el centinela del scroll infinito', () => {
      const items = buildRankingItems([segment(1, 20)], 200);

      expect(items.filter((i) => i.kind === 'row').length).toBe(20);
      expect(items[items.length - 1]).toEqual({ kind: 'more', key: 'more-20', end: 20 });
    });

    it('con todas las filas cargadas no hay centinela', () => {
      const items = buildRankingItems([segment(1, 20)], 20);

      expect(items.some((i) => i.kind === 'more')).toBeFalse();
    });

    it('entre dos tramos separados pone un centinela y el hueco con cuantas filas faltan', () => {
      const items = buildRankingItems([segment(1, 20), segment(190, 210)], 300);

      const kinds = items.map((i) => i.kind);
      expect(kinds.indexOf('more')).toBe(20); // justo despues de las 20 primeras
      expect(items[21]).toEqual({ kind: 'gap', key: 'gap-190', hidden: 169, before: 190 });
      // el segundo tramo tambien tiene su centinela al final porque aun hay filas por debajo
      expect(items[items.length - 1]).toEqual({ kind: 'more', key: 'more-210', end: 210 });
    });
  });

  describe('pageBefore', () => {
    it('pide la pagina anterior al tramo', () => {
      expect(pageBefore(190, 20)).toEqual({ cursor: 169, limit: 20 }); // filas 170..189
    });

    it('cerca del principio pide solo las que quedan', () => {
      expect(pageBefore(8, 20)).toEqual({ cursor: 0, limit: 7 }); // filas 1..7
    });

    it('si el tramo ya empieza en la primera fila no hay nada anterior', () => {
      expect(pageBefore(1, 20)).toBeNull();
    });
  });

  describe('windowAround', () => {
    it('una ventana con la propia fila en medio', () => {
      expect(windowAround(200, 10)).toEqual({ cursor: 189, limit: 21 }); // filas 190..210
    });

    it('cerca del principio la ventana empieza en la primera fila', () => {
      expect(windowAround(4, 10)).toEqual({ cursor: 0, limit: 14 }); // filas 1..14
    });
  });
});
