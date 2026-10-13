import { MatchdayHistoryEntry } from '../../../core/models/ranking.model';
import { competitionShortName, mergeCompetitionHistories } from './competition-history';

const LIGA = { id: 'c1', name: 'La Liga', code: 'LA_LIGA' };
const UCL = { id: 'c2', name: 'UEFA Champions League', code: 'CHAMPIONS_LEAGUE' };

const entry = (matchdayId: string, order: number, closesAt?: string): MatchdayHistoryEntry => ({
  matchdayId,
  order,
  closesAt,
  winner: null,
  myPoints: null,
});

describe('competitionShortName', () => {
  it('usa un nombre corto conocido para cada liga', () => {
    expect(competitionShortName('LA_LIGA', 'La Liga')).toBe('Liga');
    expect(competitionShortName('CHAMPIONS_LEAGUE', 'UEFA Champions League')).toBe('UCL');
  });

  it('una liga que no conoce sale con las cuatro primeras letras', () => {
    expect(competitionShortName('OTRA', 'Eredivisie')).toBe('Ered');
  });
});

describe('mergeCompetitionHistories', () => {
  it('junta las jornadas de todas las ligas, de la mas nueva a la mas antigua, marcadas con su liga', () => {
    const merged = mergeCompetitionHistories([
      { competition: LIGA, matchdays: [entry('l2', 2, '2026-09-15T18:00:00Z'), entry('l1', 1, '2026-09-01T18:00:00Z')] },
      { competition: UCL, matchdays: [entry('u1', 1, '2026-09-08T18:00:00Z')] },
    ]);

    expect(merged.map((m) => `${m.competition?.code}-${m.order}`)).toEqual(['LA_LIGA-2', 'CHAMPIONS_LEAGUE-1', 'LA_LIGA-1']);
  });

  it('si alguna jornada no trae fecha no se puede ordenar entre ligas: devuelve vacio', () => {
    const merged = mergeCompetitionHistories([
      { competition: LIGA, matchdays: [entry('l1', 1, '2026-09-01T18:00:00Z')] },
      { competition: UCL, matchdays: [entry('u1', 1)] },
    ]);

    expect(merged).toEqual([]);
  });

  it('sin ligas o sin jornadas devuelve vacio', () => {
    expect(mergeCompetitionHistories([])).toEqual([]);
    expect(mergeCompetitionHistories([{ competition: LIGA, matchdays: [] }])).toEqual([]);
  });
});
